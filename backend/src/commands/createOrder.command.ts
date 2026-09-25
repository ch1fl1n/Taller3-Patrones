import { ApolloContext, CreateOrderInput, CreateOrderResult, Medication } from '../types';
import { DEMO_PATIENT_ID } from '../context';
import { findOrderById, mapMedicationRow } from '../datasources/ordersRepository';
import { isValidDocumentUrl } from '../domain/prescription';
import { scheduleApproval, schedulePrescriptionReview } from '../domain/orderWorkflow';
import { publishOrderStatusUpdate, publishMedicationStockUpdate } from '../resolvers/subscription.resolvers';
import { insufficientStockError, parseCommandError, validationError } from './errors';

export async function createOrder(
  input: CreateOrderInput,
  context: ApolloContext
): Promise<CreateOrderResult> {
  const { items } = input;
  const documentUrl = input.prescriptionEvidence?.documentUrl?.trim() || null;

  // 1. Validaciones de entrada
  if (!items || items.length === 0) {
    return validationError('Order must contain at least one item', 'items');
  }
  if (items.some(item => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    return validationError('Quantity must be a positive integer', 'items.quantity');
  }
  if (documentUrl !== null && !isValidDocumentUrl(documentUrl)) {
    return validationError(
      'Prescription evidence must be an http(s) link to the document',
      'prescriptionEvidence.documentUrl'
    );
  }

  const userId = context.user?.id || DEMO_PATIENT_ID;

  // Agrupar ítems repetidos del mismo medicamento
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.medicationId, (quantities.get(item.medicationId) ?? 0) + item.quantity);
  }
  const medicationIds = [...quantities.keys()];

  // 2. Estado actual de los medicamentos (write model: se lee la tabla, no la proyección)
  const { data: rows, error: medError } = await context.supabase
    .from('medications')
    .select('*')
    .in('id', medicationIds);

  if (medError) {
    throw new Error(`Failed to validate order items: ${medError.message}`);
  }

  const medications = new Map<string, Medication>(
    (rows || []).map(row => [row.id, mapMedicationRow(row)])
  );
  const missingIds = medicationIds.filter(id => !medications.has(id));
  if (missingIds.length > 0) {
    return validationError(`Medications not found: ${missingIds.join(', ')}`, 'items.medicationId');
  }

  // 3. Invariante 2: stock suficiente. Esta verificación da un error rico al cliente;
  //    la función SQL la repite con la fila bloqueada para cubrir compras concurrentes.
  for (const [medicationId, quantity] of quantities) {
    const medication = medications.get(medicationId)!;
    if (medication.stock < quantity) {
      return insufficientStockError(medication, quantity);
    }
  }

  // 4. Invariante 1: los medicamentos formulados exigen evidencia de fórmula médica
  const prescribed = [...medications.values()].filter(m => m.requiresPrescription);
  if (prescribed.length > 0 && !documentUrl) {
    return {
      __typename: 'PrescriptionRequiredError',
      message: 'Prescription evidence is required for one or more medications',
      code: 'PRESCRIPTION_REQUIRED',
      medicationIds: prescribed.map(m => m.id),
      medicationNames: prescribed.map(m => m.commercialName),
    };
  }

  // 5. Comando atómico: orden + ítems + descuento de stock + evidencia en una sola transacción
  const { data: orderId, error: rpcError } = await context.supabase.rpc('create_order', {
    p_patient_id: userId,
    p_items: medicationIds.map(id => ({ medication_id: id, quantity: quantities.get(id) })),
    p_document_url: documentUrl,
  });

  if (rpcError) {
    const { code, detail } = parseCommandError(rpcError.message);

    // Otro pedido se llevó el stock entre la verificación y el bloqueo
    if (code === 'INSUFFICIENT_STOCK' && detail) {
      const { data: fresh } = await context.supabase
        .from('medications')
        .select('*')
        .eq('id', detail)
        .single();
      if (fresh) {
        return insufficientStockError(mapMedicationRow(fresh), quantities.get(detail) ?? 0);
      }
    }

    throw new Error(`Failed to create order: ${rpcError.message}`);
  }

  const order = await findOrderById(orderId as string);
  if (!order) {
    throw new Error(`Order ${orderId} was created but could not be read back`);
  }

  // 6. Publicar eventos y arrancar el procesamiento asíncrono
  await publishOrderStatusUpdate(order);
  for (const item of order.items) {
    if (item.medication) {
      await publishMedicationStockUpdate(item.medication);
    }
  }

  if (order.prescriptionEvidence) {
    schedulePrescriptionReview(
      order.id,
      order.prescriptionEvidence.id,
      order.prescriptionEvidence.documentUrl
    );
  } else {
    scheduleApproval(order.id);
  }

  console.log(`✅ Order ${order.id} created (${order.status})`);

  return {
    __typename: 'CreateOrderSuccess',
    order,
  };
}
