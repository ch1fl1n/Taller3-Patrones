// Prueba de punta a punta contra el servidor real y la base local.
// Requiere: `supabase start` y el backend corriendo (`npm run dev`) en otra terminal.
// Uso: npm run test:e2e   (tarda ~40 s por las demoras del procesamiento asíncrono)
//
// Crea órdenes de prueba en la base; `supabase db reset` la deja limpia de nuevo.
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { supabase } from '../src/datasources/supabaseClient';

const PORT = process.env.PORT || 4000;
const HTTP_ENDPOINT = `http://localhost:${PORT}/graphql`;
const WS_ENDPOINT = `ws://localhost:${PORT}/graphql`;

let failures = 0;

function check(name: string, condition: boolean, detail = '') {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!condition) failures++;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function gql(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const response = await fetch(HTTP_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  });
  return (await response.json()) as { data?: any; errors?: { message: string }[] };
}

// Para operaciones que deben responder sin errores de GraphQL
async function data(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const body = await gql(query, variables, headers);
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const CREATE = `mutation($input: CreateOrderInput!) { createOrder(input: $input) {
  __typename
  ... on CreateOrderSuccess { order { id status total items { quantity unitPrice medication { id stock category { name } } } prescriptionEvidence { validationStatus } } }
  ... on MutationError { message code }
  ... on InsufficientStockError { availableStock requestedQuantity }
  ... on PrescriptionRequiredError { medicationNames }
  ... on ValidationError { field }
} }`;
const ORDER = `query($id: UUID!) { order(id: $id) { id status total createdAt patient { fullName } prescriptionEvidence { validationStatus } items { quantity medication { commercialName } } } }`;
const CANCEL = `mutation($id: UUID!) { cancelOrder(orderId: $id) { __typename ... on MutationError { code } ... on CancelOrderSuccess { order { status } } } }`;
const CONFIRM = `mutation($id: UUID!) { confirmOrder(orderId: $id) { __typename ... on MutationError { code } ... on ConfirmOrderSuccess { order { status } } } }`;
const SUBMIT = `mutation($input: SubmitPrescriptionInput!) { submitPrescriptionEvidence(input: $input) { __typename ... on MutationError { code } ... on SubmitPrescriptionSuccess { order { status prescriptionEvidence { validationStatus } } } } }`;

async function medicationByName(name: string) {
  const result = await data(
    `query($f: MedicationFilterInput) { medications(filter: $f) { items { id commercialName requiresPrescription } } }`,
    { f: { search: name, limit: 5 } }
  );
  return result.medications.items.find((m: any) => m.commercialName === name);
}

async function stockOf(id: string): Promise<number> {
  return (await data(`query($id: UUID!) { medication(id: $id) { stock } }`, { id })).medication.stock;
}

async function catalogAndScalars() {
  const catalog = await data(`{ medications(filter: { search: "amox" }) { totalCount items { activeIngredient category { name } } } }`);
  check('búsqueda por principio activo', catalog.medications.totalCount === 1 && catalog.medications.items[0].activeIngredient === 'Amoxicilina');

  const injected = await gql(`{ medications(filter: { search: "x,id.not.is.null" }) { totalCount } }`);
  check('búsqueda saneada (sin inyección de filtros)', !injected.errors && injected.data.medications.totalCount === 0, JSON.stringify(injected.data));

  const badUuid = await gql(`{ order(id: "no-es-uuid") { id } }`);
  check('escalar UUID rechaza valores inválidos', Boolean(badUuid.errors?.[0]?.message.includes('UUID')));
}

async function validationErrors(paracetamolId: string, amoxicilinaId: string) {
  let r = (await data(CREATE, { input: { items: [] } })).createOrder;
  check('orden vacía → ValidationError', r.__typename === 'ValidationError', r.code);
  r = (await data(CREATE, { input: { items: [{ medicationId: paracetamolId, quantity: 0 }] } })).createOrder;
  check('cantidad 0 → ValidationError', r.__typename === 'ValidationError', r.field);
  r = (await data(CREATE, { input: { items: [{ medicationId: paracetamolId, quantity: 99999 }] } })).createOrder;
  check('stock insuficiente → InsufficientStockError', r.__typename === 'InsufficientStockError', `${r.availableStock}/${r.requestedQuantity}`);
  r = (await data(CREATE, { input: { items: [{ medicationId: amoxicilinaId, quantity: 1 }] } })).createOrder;
  check('formulado sin evidencia → PrescriptionRequiredError', r.__typename === 'PrescriptionRequiredError', JSON.stringify(r.medicationNames));
  r = (await data(CREATE, { input: { items: [{ medicationId: amoxicilinaId, quantity: 1 }], prescriptionEvidence: { documentUrl: 'no-es-url' } } })).createOrder;
  check('evidencia que no es URL → ValidationError', r.__typename === 'ValidationError', r.field);
  r = (await data(CANCEL, { id: '11111111-1111-1111-1111-111111111111' })).cancelOrder;
  check('cancelar orden inexistente → OrderNotFoundError', r.__typename === 'OrderNotFoundError');
}

async function orderWithoutPrescription(paracetamolId: string) {
  const stockBefore = await stockOf(paracetamolId);
  const r = (await data(CREATE, {
    input: { items: [{ medicationId: paracetamolId, quantity: 1 }, { medicationId: paracetamolId, quantity: 1 }] },
  })).createOrder;
  check('orden sin fórmula creada en PENDING_APPROVAL', r.__typename === 'CreateOrderSuccess' && r.order.status === 'PENDING_APPROVAL', r.__typename);
  const order = r.order;
  check('ítems repetidos agrupados en una línea', order.items.length === 1 && order.items[0].quantity === 2);
  check('categoría resuelta en los ítems', order.items[0].medication.category?.name === 'Analgésico');
  check('stock descontado', (await stockOf(paracetamolId)) === stockBefore - 2);

  // La subscription debe recibir los cambios del procesamiento asíncrono
  const statuses: string[] = [];
  const ws = createClient({ url: WS_ENDPOINT, webSocketImpl: WebSocket });
  const dispatched = new Promise<void>((resolve, reject) => {
    ws.subscribe(
      { query: `subscription($id: UUID!) { orderStatusChanged(orderId: $id) { id status } }`, variables: { id: order.id } },
      {
        next: message => {
          const status = (message.data as any)?.orderStatusChanged?.status;
          statuses.push(status);
          if (status === 'DISPATCHED') resolve();
        },
        error: reject,
        complete: () => {},
      }
    );
  });
  await Promise.race([dispatched, sleep(20000)]);
  await ws.dispose();
  check('subscription recibe APPROVED → DISPATCHED', statuses.join(',') === 'APPROVED,DISPATCHED', statuses.join(','));

  const cancel = (await data(CANCEL, { id: order.id })).cancelOrder;
  check('cancelar orden despachada → InvalidOrderStatusError', cancel.__typename === 'InvalidOrderStatusError');
}

async function cancellation(paracetamolId: string) {
  const stockBefore = await stockOf(paracetamolId);
  const order = (await data(CREATE, { input: { items: [{ medicationId: paracetamolId, quantity: 3 }] } })).createOrder.order;
  let r = (await data(CANCEL, { id: order.id })).cancelOrder;
  check('cancelar orden pendiente → CANCELLED', r.__typename === 'CancelOrderSuccess' && r.order.status === 'CANCELLED');
  check('stock restaurado al cancelar', (await stockOf(paracetamolId)) === stockBefore);
  r = (await data(CANCEL, { id: order.id })).cancelOrder;
  check('cancelar dos veces → InvalidOrderStatusError', r.__typename === 'InvalidOrderStatusError');
}

async function orderWithPrescription(amoxicilinaId: string) {
  let r = (await data(CREATE, {
    input: {
      items: [{ medicationId: amoxicilinaId, quantity: 1 }],
      prescriptionEvidence: { documentUrl: 'https://docs.ejemplo.com/formula-rechazada.pdf' },
    },
  })).createOrder;
  check('orden con fórmula creada, evidencia PENDING', r.__typename === 'CreateOrderSuccess' && r.order.prescriptionEvidence?.validationStatus === 'PENDING', r.__typename);
  const orderId = r.order.id;

  await sleep(6500);
  let order = (await data(ORDER, { id: orderId })).order;
  check('fórmula rechazada: la orden sigue PENDING_APPROVAL', order.status === 'PENDING_APPROVAL' && order.prescriptionEvidence.validationStatus === 'REJECTED');
  check('proyección con paciente, ítems y fecha ISO', order.patient?.fullName === 'Juan Pérez' && order.items[0].medication.commercialName === 'Amoxicilina' && order.createdAt.endsWith('Z'));

  r = (await data(SUBMIT, { input: { orderId, evidence: { documentUrl: 'https://docs.ejemplo.com/formula-ok.pdf' } } })).submitPrescriptionEvidence;
  check('reenvío de evidencia aceptado', r.__typename === 'SubmitPrescriptionSuccess' && r.order.prescriptionEvidence.validationStatus === 'PENDING', r.__typename);

  await sleep(6500);
  order = (await data(ORDER, { id: orderId })).order;
  check('fórmula validada → APPROVED', order.status === 'APPROVED' && order.prescriptionEvidence.validationStatus === 'VALIDATED', `${order.status}/${order.prescriptionEvidence?.validationStatus}`);

  r = (await data(CONFIRM, { id: orderId })).confirmOrder;
  check('confirmOrder sin rol admin → UNAUTHORIZED', r.__typename === 'ValidationError' && r.code === 'UNAUTHORIZED');
  r = (await data(CONFIRM, { id: orderId }, { 'x-demo-role': 'admin' })).confirmOrder;
  check('confirmOrder como admin → DISPATCHED', r.__typename === 'ConfirmOrderSuccess' && r.order.status === 'DISPATCHED', r.__typename);
}

// Invariante 2 con compras simultáneas: con stock 1, solo una orden puede ganar
async function concurrency() {
  const loratadina = await medicationByName('Loratadina');
  const originalStock = await stockOf(loratadina.id);
  await supabase.from('medications').update({ stock: 1 }).eq('id', loratadina.id);

  try {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        data(CREATE, { input: { items: [{ medicationId: loratadina.id, quantity: 1 }] } }).then(d => d.createOrder.__typename)
      )
    );
    const successes = results.filter(t => t === 'CreateOrderSuccess').length;
    check('5 compras simultáneas con stock 1 → 1 éxito', successes === 1, results.join(', '));
    check('stock nunca queda negativo', (await stockOf(loratadina.id)) === 0);
  } finally {
    // Restaurar el stock original del medicamento de prueba
    await supabase.from('medications').update({ stock: originalStock }).eq('id', loratadina.id);
  }
}

async function main() {
  const health = await fetch(HTTP_ENDPOINT.replace('/graphql', '/health')).catch(() => null);
  if (!health?.ok) {
    console.error(`No hay backend en ${HTTP_ENDPOINT}. Levántalo con "npm run dev" antes de correr este test.`);
    process.exit(1);
  }

  const paracetamol = await medicationByName('Paracetamol');
  const amoxicilina = await medicationByName('Amoxicilina');

  await catalogAndScalars();
  await validationErrors(paracetamol.id, amoxicilina.id);
  await cancellation(paracetamol.id);
  await concurrency();
  // Estos dos esperan al procesamiento asíncrono; corren en paralelo para ahorrar tiempo
  await Promise.all([orderWithoutPrescription(paracetamol.id), orderWithPrescription(amoxicilina.id)]);

  const mine = await data(`{ myOrders { id } }`);
  check('myOrders lista las órdenes del paciente demo', mine.myOrders.length >= 4, `${mine.myOrders.length} órdenes`);

  console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLO(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('ERROR', error);
  process.exit(1);
});
