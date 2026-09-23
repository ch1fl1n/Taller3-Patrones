# PLANNING.md — Afirmative Pill: Arquitectura GraphQL + CQRS

> Documento de planificación técnica para el desarrollo del taller "Arquitectura de Software Basada en GraphQL y CQRS para E-Commerce Farmacéutico". Este documento es la fuente de verdad para el desarrollo autónomo del proyecto (Kiro). Contiene alcance, decisiones de arquitectura, modelo de datos, contratos GraphQL, plan de trabajo por fases y checklist de entregables/rúbrica.

---

## 0. Resumen ejecutivo

Construir una plataforma e-commerce farmacéutica ("Afirmative Pill") compuesta por:

- **Backend**: Apollo Server (Node.js/TypeScript) monolito modular, GraphQL puro (cero REST), con arquitectura **CQRS** (comandos separados de queries/proyecciones), DataLoader para evitar N+1, persistiendo en **Supabase (PostgreSQL)**.
- **Frontend**: React + Next.js + Apollo Client (ApolloProvider/Context), consumiendo exclusivamente GraphQL (Queries, Mutations, Subscriptions).
- **Dominio**: catálogo de medicamentos, carrito/pedido, validación de fórmula médica, control de stock atómico, seguimiento de orden con actualizaciones en tiempo real.

Calificación objetivo: cubrir el 100% de la rúbrica (Diseño GraphQL 40%, CQRS 25%, Frontend Apollo 20%, Persistencia/Docs 15%).

---

## 1. Alcance y restricciones no negociables

1. **Zero-REST Mandate**: ninguna comunicación cliente-servidor puede usar HTTP REST. Todo pasa por un único endpoint `/graphql` (queries, mutations, subscriptions vía WS o SSE).
2. **Ecosistema Apollo obligatorio**: Apollo Server en backend, Apollo Client + ApolloProvider en frontend (React/Next.js).
3. **CQRS real**: separar explícitamente el "write model" (comandos/mutations que validan invariantes de negocio) del "read model" (queries/proyecciones optimizadas para lectura, con tolerancia a consistencia eventual).
4. **Persistencia en Supabase (PostgreSQL)**: cargar el dataset de 50 medicamentos provisto y consultarlo desde ahí.
5. **Mitigación de N+1**: uso de DataLoader (o equivalente) demostrable en resolvers anidados, con evidencia en logs de agrupación por lote.
6. **Documentación**: README con diagrama de arquitectura, schema.graphql completo, justificación de CQRS y N+1.
7. **Video de sustentación** (5-8 min) mostrando el flujo completo y Network tab con evidencia de GraphQL puro.

---

## 2. Decisiones de arquitectura (ADR resumido)

| Decisión | Elección | Justificación |
|---|---|---|
| Estilo de backend | Monolito modular (no federación) | El taller permite ambas opciones; monolito reduce complejidad operativa manteniendo separación lógica por módulos (catalog, orders, prescriptions) |
| Servidor GraphQL | `@apollo/server` standalone + Express (para exponer WS de subscriptions con `graphql-ws`) | Permite HTTP + WebSocket en el mismo proceso |
| Lenguaje | TypeScript en frontend y backend | Tipado fuerte alineado con SDL fuertemente tipado |
| ORM/Query builder | `pg` (cliente nativo) o Prisma/Knex — se recomienda **Prisma** apuntando a Supabase Postgres | Prisma facilita migraciones y tipado; alternativamente SQL crudo con `pg` si se prefiere control total |
| Patrón anti N+1 | `dataloader` (npm) por request, instanciado en el contexto de Apollo | Estándar de facto documentado en la rúbrica |
| CQRS - separación física | Mismos módulos de dominio, pero **carpetas y clases separadas**: `commands/` (con validadores + handlers) vs `queries/` (proyecciones/read models); no se exige bus de mensajería ni bases de datos separadas, pero sí separación de código y de tipos de retorno | El taller pide "libertad técnica"; una separación de código estricta demuestra el concepto sin sobre-ingeniería de un stack de eventos completo |
| Consistencia eventual | Estado de orden con máquina de estados explícita (`PENDING_APPROVAL → APPROVED → DISPATCHED` / `CANCELLED`); mutación devuelve el estado inmediato "optimista" (`PENDING_APPROVAL`) y una subscription notifica cambios posteriores | Refleja el requerimiento 3.3 sobre qué ve el usuario mientras se procesa |
| Tiempo real | GraphQL Subscriptions sobre `graphql-ws` (protocolo moderno, no `subscriptions-transport-ws` deprecado) | Recomendado por Apollo actualmente |
| Autenticación (mínima, no es foco de la rúbrica pero es necesaria para "paciente") | JWT simple simulado o Supabase Auth; contexto de Apollo resuelve `currentUser` | No está explícitamente en la rúbrica, pero sin usuario no hay dueño de la orden — mantenerlo simple |
| Frontend routing | Next.js App Router | Estándar actual, compatible con Apollo Client `@apollo/client` + RSC (usar Client Components para hooks de Apollo) |
| Gestión de caché | Apollo InMemoryCache con `typePolicies` para `Medication` y `Order`, actualización de caché tras mutations vía `update()` o `refetchQueries` | Pedido explícito en el criterio 3 de la rúbrica |

---

## 3. Modelo de dominio

### 3.1 Entidades principales

- **Medication** (medicamento): id, nombre comercial, principio activo, categoría terapéutica, laboratorio, presentación, precio, stock, `requiresPrescription` (boolean), indicaciones, contraindicaciones.
- **Category** (categoría terapéutica): id, nombre. (Relación N:1 o N:N con Medication — decidir según dataset; ver sección 4).
- **Patient/User**: id, nombre, email.
- **Order** (pedido/orden): id, patientId, items[], estado (enum `OrderStatus`), total, timestamps, `prescriptionEvidence` (si aplica).
- **OrderItem**: medicationId, cantidad, precio unitario al momento de compra.
- **PrescriptionEvidence** (soporte de fórmula médica): id, orderId, tipo de documento, url o referencia, estado de validación (`PENDING`, `VALIDATED`, `REJECTED`).

### 3.2 Invariantes de negocio (a proteger en los comandos)

1. No se puede crear/confirmar una orden si algún ítem tiene `requiresPrescription = true` y no existe evidencia de fórmula asociada.
2. No se puede reservar/decrementar stock si `stock < cantidad solicitada` — la operación debe ser atómica (transacción SQL con `SELECT ... FOR UPDATE` o `UPDATE ... WHERE stock >= cantidad RETURNING *`).
3. Una orden no puede transicionar a un estado inválido (ej. de `CANCELLED` a `APPROVED`). Modelar la máquina de estados explícitamente en el command handler.
4. El precio unitario se congela en el momento de la compra (no debe recalcularse si el precio del catálogo cambia después).

---

## 4. Modelo de datos en Supabase (PostgreSQL)

> Nota: el dataset de 50 medicamentos se provee en un Google Sheet (ver sección 7 del taller original). Se debe importar tal cual a una tabla base y luego normalizar si es necesario.

### 4.1 Tablas sugeridas (DDL de referencia)

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table medications (
  id uuid primary key default gen_random_uuid(),
  commercial_name text not null,
  active_ingredient text not null,
  category_id uuid references categories(id),
  laboratory text not null,
  presentation text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null check (stock >= 0),
  requires_prescription boolean not null default false,
  indications text,
  contraindications text,
  created_at timestamptz default now()
);
create index idx_medications_category on medications(category_id);
create index idx_medications_active_ingredient on medications(active_ingredient);
create index idx_medications_commercial_name on medications(commercial_name);

create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique
);

create type order_status as enum ('PENDING_APPROVAL','APPROVED','DISPATCHED','CANCELLED');

create table orders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) not null,
  status order_status not null default 'PENDING_APPROVAL',
  total numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  medication_id uuid references medications(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null
);

create table prescription_evidences (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  document_url text,
  validation_status text not null default 'PENDING'
);
```

### 4.2 Carga del dataset

1. Descargar el Google Sheet provisto (enlace en la sección 7 del taller) como CSV.
2. Normalizar categorías (extraer valores únicos de "categoría terapéutica" → tabla `categories`).
3. Importar a `medications` vía script Node (o `psql \copy`) mapeando columnas del CSV a las columnas SQL.
4. Verificar conteo final = 50 registros y que ningún campo obligatorio quede nulo.

---

## 5. Contrato GraphQL (schema.graphql) — diseño de referencia

> Este es el diseño base. Ajustar nombres según el dataset real, pero mantener la estructura conceptual (Types, Enums, Inputs, Payloads, Scalars custom).

```graphql
scalar DateTime
scalar UUID

enum OrderStatus {
  PENDING_APPROVAL
  APPROVED
  DISPATCHED
  CANCELLED
}

type Category {
  id: UUID!
  name: String!
}

type Medication {
  id: UUID!
  commercialName: String!
  activeIngredient: String!
  category: Category!
  laboratory: String!
  presentation: String!
  price: Float!
  stock: Int!
  requiresPrescription: Boolean!
  indications: String
  contraindications: String
}

# --- Read model: vista condensada para catálogo (evita over-fetching) ---
type MedicationSummary {
  id: UUID!
  commercialName: String!
  price: Float!
  presentation: String!
}

type MedicationConnection {
  items: [MedicationSummary!]!
  totalCount: Int!
}

input MedicationFilterInput {
  search: String
  categoryId: UUID
  activeIngredient: String
  limit: Int = 20
  offset: Int = 0
}

type OrderItem {
  id: UUID!
  medication: Medication!
  quantity: Int!
  unitPrice: Float!
  subtotal: Float!
}

type Order {
  id: UUID!
  status: OrderStatus!
  total: Float!
  items: [OrderItem!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# --- Queries (Read Model) ---
type Query {
  medications(filter: MedicationFilterInput): MedicationConnection!
  medication(id: UUID!): Medication
  order(id: UUID!): Order
  myOrders: [Order!]!
}

# --- Inputs de comandos ---
input OrderItemInput {
  medicationId: UUID!
  quantity: Int!
}

input CreateOrderInput {
  items: [OrderItemInput!]!
}

input PrescriptionEvidenceInput {
  documentUrl: String!
}

input SubmitPrescriptionInput {
  orderId: UUID!
  evidence: PrescriptionEvidenceInput!
}

# --- Payloads (errores ricos, no excepciones crudas) ---
interface MutationError {
  message: String!
}

type ValidationError implements MutationError {
  message: String!
  field: String
}

type InsufficientStockError implements MutationError {
  message: String!
  medicationId: UUID!
  availableStock: Int!
}

type PrescriptionRequiredError implements MutationError {
  message: String!
  medicationIds: [UUID!]!
}

union CreateOrderResult = CreateOrderSuccess | ValidationError | InsufficientStockError | PrescriptionRequiredError

type CreateOrderSuccess {
  order: Order!
}

type SubmitPrescriptionResult {
  order: Order!
}

# --- Mutations (Write Model / Comandos) ---
type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderResult!
  submitPrescriptionEvidence(input: SubmitPrescriptionInput!): SubmitPrescriptionResult!
  confirmOrder(orderId: UUID!): Order!
  cancelOrder(orderId: UUID!): Order!
}

# --- Subscriptions ---
type Subscription {
  orderStatusChanged(orderId: UUID!): Order!
}
```

**Decisiones de diseño reflejadas en este contrato:**
- `MedicationSummary` vs `Medication` completo → resuelve el Escenario A (vista condensada vs ficha detallada), previniendo over-fetching real a nivel de schema, no solo por selección de campos.
- Uso de `union`/`interface` para errores de mutación en vez de solo lanzar excepciones GraphQL genéricas → mutaciones "ricas en errores de validación" (criterio de rúbrica).
- Separación clara de `Query` (read model) y `Mutation` (comandos) es la manifestación directa de CQRS en el schema.

---

## 6. Estrategia CQRS en el código (estructura de carpetas backend)

```
backend/
├── src/
│   ├── schema/
│   │   ├── schema.graphql
│   │   └── typeDefs.ts
│   ├── commands/                # WRITE MODEL
│   │   ├── createOrder.command.ts
│   │   ├── submitPrescriptionEvidence.command.ts
│   │   ├── confirmOrder.command.ts
│   │   └── cancelOrder.command.ts
│   ├── queries/                 # READ MODEL / PROYECCIONES
│   │   ├── getMedications.query.ts
│   │   ├── getMedicationById.query.ts
│   │   └── getOrderProjection.query.ts
│   ├── domain/
│   │   ├── order.entity.ts
│   │   ├── orderStatus.stateMachine.ts
│   │   └── invariants.ts        # reglas de negocio reutilizables
│   ├── datasources/
│   │   ├── supabaseClient.ts
│   │   ├── medicationsRepository.ts
│   │   └── ordersRepository.ts
│   ├── loaders/
│   │   ├── medicationLoader.ts   # DataLoader por request
│   │   └── categoryLoader.ts
│   ├── resolvers/
│   │   ├── query.resolvers.ts
│   │   ├── mutation.resolvers.ts
│   │   └── subscription.resolvers.ts
│   ├── pubsub.ts                # PubSub para subscriptions (in-memory o Redis)
│   ├── context.ts               # crea DataLoaders + user por request
│   └── server.ts
└── package.json
```

**Regla de oro CQRS a aplicar:** los resolvers de `Mutation` **solo llaman a `commands/*`**, nunca leen directamente proyecciones optimizadas; los resolvers de `Query` **solo llaman a `queries/*`**. Los commands, tras persistir, publican eventos al `pubsub` para alimentar subscriptions.

---

## 7. Mitigación de N+1 (DataLoader)

- Instanciar un `DataLoader` **por request** (dentro de la función `context` de Apollo Server), nunca a nivel global/singleton, para evitar fugas de caché entre usuarios.
- Ejemplo de uso: al resolver `Medication.category` para una lista de medicamentos, usar `categoryLoader.load(medication.categoryId)` en lugar de una query individual por cada medicamento.
- Loguear en el batch function del DataLoader cuántos IDs se agrupan por llamada (`console.log('[DataLoader] batching', ids.length, 'category ids')`) — esto es evidencia requerida para el video de sustentación.

```ts
// loaders/categoryLoader.ts
export const createCategoryLoader = (supabase) =>
  new DataLoader(async (ids: readonly string[]) => {
    console.log(`[DataLoader] batching ${ids.length} category ids`);
    const { data } = await supabase.from('categories').select('*').in('id', ids as string[]);
    const map = new Map(data.map((c) => [c.id, c]));
    return ids.map((id) => map.get(id));
  });
```

---

## 8. Manejo de consistencia eventual (Escenario C)

1. `createOrder` valida invariantes síncronamente (stock, prescripción) y persiste la orden en estado `PENDING_APPROVAL` dentro de una transacción.
2. Inmediatamente se retorna `CreateOrderSuccess.order` con estado `PENDING_APPROVAL` — el frontend debe mostrar explícitamente este estado como "procesando" (no como error ni como éxito final).
3. Un proceso (puede ser simulado con un `setTimeout`/job simple para el taller, ya que no se exige infraestructura real de colas) transiciona la orden a `APPROVED` y luego a `DISPATCHED`, publicando en cada cambio vía `pubsub.publish('ORDER_STATUS_CHANGED', order)`.
4. El frontend se suscribe a `orderStatusChanged(orderId)` y actualiza la UI reactivamente sin hacer polling.
5. Documentar explícitamente en el README esta estrategia como respuesta al criterio "Tratamiento de Consistencia Eventual".

---

## 9. Frontend (React + Next.js + Apollo Client)

### 9.1 Estructura sugerida

```
frontend/
├── app/
│   ├── layout.tsx          # envuelve con <ApolloProviderWrapper>
│   ├── catalog/page.tsx    # useQuery(GET_MEDICATIONS)
│   ├── medication/[id]/page.tsx
│   ├── cart/page.tsx
│   └── orders/[id]/page.tsx # useQuery + useSubscription
├── lib/
│   └── apolloClient.ts
├── graphql/
│   ├── queries.ts
│   ├── mutations.ts
│   └── subscriptions.ts
└── components/
```

### 9.2 Configuración de Apollo Client

```ts
// lib/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpLink = new HttpLink({ uri: 'http://localhost:4000/graphql' });
const wsLink = new GraphQLWsLink(createClient({ url: 'ws://localhost:4000/graphql' }));

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === 'OperationDefinition' && def.operation === 'subscription';
  },
  wsLink,
  httpLink
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Order: { fields: { status: { merge: false } } },
    },
  }),
});
```

- Envolver `app/layout.tsx` con `<ApolloProvider client={client}>` (Client Component).
- Usar `useQuery` para catálogo y ficha; `useMutation` con `update(cache, { data })` para `createOrder` (agregar la orden nueva a la caché sin refetch completo); `useSubscription` en la pantalla de seguimiento de orden.
- Manejar explícitamente los tres estados de cada hook: `loading`, `error`, `data`.

---

## 10. Plan de trabajo por fases (para ejecución autónoma)

### Fase 0 — Setup del entorno
- [ ] Crear proyecto Supabase, obtener `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Crear monorepo o dos repos (`backend/`, `frontend/`).
- [ ] Inicializar backend: Node + TypeScript + `@apollo/server` + `express` + `graphql-ws` + `dataloader` + cliente Supabase (`@supabase/supabase-js` o `pg`/Prisma).
- [ ] Inicializar frontend: `create-next-app` + `@apollo/client` + `graphql`.

### Fase 1 — Modelo de datos y carga de dataset
- [ ] Ejecutar DDL de la sección 4.1 en Supabase.
- [ ] Descargar y transformar el CSV del dataset de 50 medicamentos.
- [ ] Escribir script de importación (`scripts/seed.ts`) y ejecutarlo.
- [ ] Verificar 50 registros cargados correctamente vía SQL.

### Fase 2 — Schema GraphQL y resolvers de lectura (Escenario A)
- [ ] Escribir `schema.graphql` completo (sección 5) y ajustarlo a nombres reales del dataset.
- [ ] Implementar `queries/getMedications.query.ts` con filtros (search, categoría, principio activo) y paginación.
- [ ] Implementar `medicationLoader` y `categoryLoader`.
- [ ] Probar en Apollo Sandbox que una consulta anidada (medicamentos + categoría) no genera N+1 (revisar logs de batching).

### Fase 3 — Comandos de dominio (Escenario B)
- [ ] Implementar `createOrder.command.ts`: valida stock, valida `requiresPrescription`, decrementa stock atómicamente (transacción SQL), crea orden + items.
- [ ] Implementar `submitPrescriptionEvidence.command.ts` y regla de transición a `APPROVED` solo si toda evidencia requerida está validada.
- [ ] Implementar `confirmOrder` / `cancelOrder` respetando la máquina de estados.
- [ ] Escribir pruebas unitarias de invariantes (stock insuficiente, receta faltante, transición inválida de estado).

### Fase 4 — Proyección y tiempo real (Escenario C)
- [ ] Implementar `queries/getOrderProjection.query.ts`.
- [ ] Implementar `pubsub` y resolver de `Subscription.orderStatusChanged`.
- [ ] Simular la transición asíncrona de estado (job simple) que publica al pubsub.

### Fase 5 — Frontend
- [ ] Configurar Apollo Client con split link (HTTP + WS).
- [ ] Pantalla de catálogo (`useQuery` + filtros) usando `MedicationSummary`.
- [ ] Pantalla de ficha detallada (`useQuery(GET_MEDICATION)`).
- [ ] Carrito local (estado de React, no requiere backend hasta el checkout).
- [ ] Mutación `createOrder` (`useMutation`) con manejo del `union CreateOrderResult` en la UI (mostrar error específico según tipo).
- [ ] Pantalla de seguimiento de orden con `useQuery` inicial + `useSubscription` para actualizaciones.

### Fase 6 — Verificación de restricciones no negociables
- [ ] Confirmar en DevTools → Network que **todas** las llamadas van a `/graphql` (ninguna a rutas REST).
- [ ] Confirmar que las respuestas no traen campos no solicitados (probar dos queries distintas a `medications` y comparar payloads).
- [ ] Confirmar en logs del servidor que el DataLoader agrupa múltiples IDs en una sola llamada a Supabase.

### Fase 7 — Documentación y entregables
- [ ] Diagrama de arquitectura (React/Apollo Client ↔ Apollo Server ↔ resolvers/DataLoader ↔ Supabase). Puede hacerse en Mermaid dentro del README.
- [ ] `schema.graphql` final commiteado en la raíz del backend.
- [ ] README.md con: instrucciones de arranque (backend y frontend), justificación de CQRS, justificación de mitigación N+1, diagrama.
- [ ] Grabar video de 5-8 minutos: flujo Catálogo → Selección → Carrito → Mutation → Consulta de orden proyectada + evidencia de Network tab + evidencia de logs de DataLoader.

---

## 11. Checklist de cobertura de rúbrica

| # | Criterio (peso) | Cómo se cubre en este plan |
|---|---|---|
| 1 | Diseño GraphQL (40%) | Schema SDL con Object Types, Scalars custom (`UUID`, `DateTime`), Enums, Inputs, Payloads tipados con `union`/`interface` de errores; queries con vista condensada vs detallada; DataLoader documentado con logs (Secciones 5, 7) |
| 2 | CQRS y dominio (25%) | Separación física `commands/` vs `queries/`; máquina de estados de orden; invariantes explícitas; estrategia de consistencia eventual documentada (Secciones 6, 8) |
| 3 | Frontend Apollo (20%) | ApolloProvider en layout raíz; hooks `useQuery`/`useMutation`/`useSubscription`; actualización de caché tras mutación (Sección 9) |
| 4 | Persistencia y docs (15%) | DDL Supabase + script de seed de 50 registros; README con diagrama, schema y justificaciones (Secciones 4, 7 del plan de fases) |

---

## 12. Riesgos y decisiones abiertas a validar con el equipo

- **Categorías del dataset real**: el DDL asume una tabla `categories` normalizada; si el CSV trae la categoría como texto libre repetido, decidir si normalizar (recomendado) o dejar como columna de texto simple en `medications` (más rápido, menos "riguroso" para la rúbrica).
- **Autenticación**: el taller no detalla requisitos de auth; se recomienda una simulación mínima (usuario fijo o JWT simple) para no consumir tiempo de desarrollo en un aspecto no evaluado explícitamente.
- **Simulación de validación médica**: no se exige integración real con un validador externo; basta con un estado `PENDING/VALIDATED/REJECTED` gestionado manualmente o con auto-aprobación tras un delay, siempre que quede documentado como decisión de diseño.
- **Subscripciones en producción**: si se despliega (Vercel + servidor aparte), verificar que el hosting del backend soporte WebSockets persistentes (Vercel serverless no los soporta bien; considerar Railway/Render/Fly.io para el backend).

---

**Fin del documento. Este plan cubre el 100% de los requerimientos obligatorios y los criterios de la rúbrica del taller "Afirmative Pill".**
