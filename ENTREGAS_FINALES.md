# Entregas finales: Afirmative Pill

Este documento dice **qué se entrega**, **dónde está la evidencia de cada criterio de la rúbrica** y **cómo grabar el video de sustentación**. Todo lo que se afirma aquí se puede comprobar en el repositorio o con las pruebas automáticas.

- Para levantar el proyecto: [INSTRUCCIONES.md](INSTRUCCIONES.md)
- Arquitectura y justificaciones: [README.md](README.md)

---

## 1. Entregables

| Entregable | Ubicación | Estado |
| --- | --- | --- |
| Código del backend (GraphQL + CQRS) | `backend/` | ✅ Listo |
| Código del frontend (Next.js + Apollo Client) | `frontend/` | ✅ Listo |
| Schema GraphQL completo | `backend/src/schema/schema.graphql` | ✅ Listo |
| Esquema de base de datos | `supabase/migrations/` | ✅ Listo |
| Dataset de 50 medicamentos cargado | `supabase/seed.sql` (generado de `scripts/medications_dataset.csv`) | ✅ Listo |
| README con diagrama y justificaciones de CQRS, N+1 y consistencia eventual | `README.md` | ✅ Listo |
| Guía de levantamiento | `INSTRUCCIONES.md` | ✅ Listo |
| Pruebas automáticas | `backend/src/__tests__/` (unitarias) y `backend/scripts/e2e.ts` | ✅ Listo |
| Video de sustentación (5 a 8 min) | Por grabar; guion en la [sección 4](#4-guion-del-video-de-sustentación-5-a-8-minutos) | ⏳ Pendiente |

---

## 2. Cobertura de la rúbrica y dónde está la evidencia

### Diseño GraphQL (40 %)

| Criterio | Evidencia |
| --- | --- |
| Schema SDL fuertemente tipado | `schema.graphql`: object types, enums (`OrderStatus`, `PrescriptionValidationStatus`), inputs y escalares propios (`UUID`, `DateTime`, con validación en `backend/src/scalars.ts`) |
| Evitar over-fetching | `MedicationSummary` (catálogo) vs. `Medication` (ficha). Además, la categoría solo se consulta si el cliente la pide (field resolver con DataLoader) |
| Mutations ricas en errores de validación | Unions de éxito y errores que implementan `MutationError`: `InsufficientStockError`, `PrescriptionRequiredError`, `InvalidOrderStatusError`, `OrderNotFoundError`, `ValidationError` |
| Mitigación N+1 | `backend/src/loaders/categoryLoader.ts`, un loader por request en `context.ts`. Logs de agrupación en la consola del backend (ver README, sección N+1) |
| Subscriptions | `orderStatusChanged(orderId)` sobre `graphql-ws`, en el mismo endpoint `/graphql` |

### CQRS y dominio (25 %)

| Criterio | Evidencia |
| --- | --- |
| Separación write/read | `backend/src/commands/` (mutations) vs. `backend/src/queries/` (queries); los resolvers solo delegan |
| Invariantes de negocio | Stock atómico y precio congelado en `create_order` (`supabase/migrations/20260925000100_order_commands.sql`); fórmula obligatoria en `createOrder.command.ts` |
| Máquina de estados | `backend/src/domain/orderStatus.stateMachine.ts` + `cancel_order` en SQL |
| Consistencia eventual | `backend/src/domain/orderWorkflow.ts`: la orden se crea en `PENDING_APPROVAL`, avanza de forma asíncrona y cada cambio se publica a la subscription |

### Frontend Apollo (20 %)

| Criterio | Evidencia |
| --- | --- |
| ApolloProvider / contexto | `frontend/app/layout.tsx` → `components/ApolloProviderWrapper.tsx` |
| `useQuery` | Catálogo, ficha, mis órdenes, seguimiento |
| `useMutation` con manejo de la union | Checkout en `app/cart/page.tsx`; cancelar y reenviar fórmula en `app/orders/[id]/page.tsx` |
| `useSubscription` | Seguimiento en vivo en `app/orders/[id]/page.tsx` |
| Actualización de caché tras mutaciones | `update()` de `createOrder` escribe la orden en `myOrders` (fragmento compartido en `graphql/fragments.ts`); cancelar y reenviar actualizan `Order:<id>` normalizada |
| Estados loading / error / data | Todas las pantallas |

### Persistencia y documentación (15 %)

| Criterio | Evidencia |
| --- | --- |
| Supabase (PostgreSQL) con el dataset | 50 medicamentos y 10 categorías normalizadas; se cargan con `supabase start` |
| Documentación | README (arquitectura, diagrama Mermaid, justificaciones), INSTRUCCIONES, CAMBIOS |

---

## 3. Verificación realizada

| Prueba | Comando | Resultado |
| --- | --- | --- |
| Unitarias: máquina de estados, reglas de fórmula, escalares | `npm test` | 31/31 ✅ |
| Punta a punta contra el servidor real | `npm run test:e2e` | 28/28 ✅ |
| Compilación del backend y del frontend sin errores de tipos | `npm run build` en cada carpeta | ✅ |

Qué cubre `test:e2e`:

- Búsqueda del catálogo y saneamiento contra inyección de filtros.
- Escalar `UUID`.
- Todos los errores tipados.
- Stock descontado y restaurado.
- **5 compras simultáneas contra stock 1 → exactamente 1 éxito.**
- Subscription recibiendo `APPROVED → DISPATCHED`.
- Fórmula rechazada, reenviada y aprobada.
- Despacho como admin.

---

## 4. Guion del video de sustentación (5 a 8 minutos)

**Preparación:**

- Ejecutar `supabase db reset`, para que *Mis órdenes* empiece vacío.
- Levantar el backend y el frontend (ver INSTRUCCIONES).
- Dejar la pantalla dividida: navegador con DevTools (pestaña *Network*, filtro *Fetch/XHR*) a un lado y la terminal del backend al otro.
- Tener a mano los dos enlaces de fórmula:
  - `https://ejemplo.com/formula-rechazada.pdf`
  - `https://ejemplo.com/formula.pdf`

| Tiempo | Qué mostrar | Qué decir |
| --- | --- | --- |
| 0:00 – 0:45 | Diagrama del README | Monolito modular, un solo endpoint GraphQL, CQRS y Supabase. |
| 0:45 – 1:45 | `schema.graphql`: `MedicationSummary` vs. `Medication`, y la union `CreateOrderResult` | Cómo el schema evita el over-fetching y cómo los errores de negocio son tipos, no excepciones. |
| 1:45 – 2:45 | Catálogo en el navegador + *Network* + terminal | Todas las llamadas van a `/graphql` (cero REST). Mostrar en la terminal `[DataLoader] batching 6 category ids`: 12 medicamentos, 1 sola consulta de categorías. |
| 2:45 – 3:15 | Carpetas `commands/` y `queries/` | La separación CQRS; los resolvers solo delegan. |
| 3:15 – 4:30 | Agregar Paracetamol → carrito → confirmar | La orden nace en *Pendiente de aprobación* (consistencia eventual). Sin recargar, pasa a *Aprobada* y *Despachada*; mostrar el panel "Tiempo real" y la conexión WS en *Network*. |
| 4:30 – 5:30 | Agregar Amoxicilina → confirmar sin enlace → confirmar con el enlace "rechazada" | Aparece `PrescriptionRequiredError` y luego la fórmula rechazada; la orden sigue pendiente. Reenviar con el enlace válido: pasa a *Aprobada*. |
| 5:30 – 6:15 | Crear otra orden y cancelarla; abrir *Mis órdenes* | Cancelar restaura el stock en la misma transacción. La orden nueva ya estaba en la lista gracias a la actualización de caché, sin refetch. |
| 6:15 – 7:00 | Terminal: `npm run test:e2e` (o su resultado ya ejecutado) | Resaltar la prueba de concurrencia: 5 compras simultáneas con stock 1 dan exactamente 1 éxito. |

---

## 5. Limitaciones conocidas (decisiones de alcance)

- **Sin autenticación real.** Cada request es el paciente demo; el rol admin se simula con el header `x-demo-role: admin`. La rúbrica no la evalúa (`planning.md`, sección 12).
- **Revisión de fórmulas simulada.** Es predecible: un enlace que contenga "rechaz" se rechaza.
- **Procesamiento asíncrono en memoria.** Si el backend se reinicia, las órdenes en curso quedan en su estado actual. En producción se usaría una cola de trabajos.
- **PubSub en memoria.** Las subscriptions funcionan con una sola instancia del backend; para escalar horizontalmente habría que usar Redis u otro broker.
- **`scripts/verification.js` quedó obsoleto.** Lo reemplaza `npm run test:e2e`.

---

## 6. Checklist antes de entregar

- [ ] Recorrido manual completo en el navegador (INSTRUCCIONES, sección 5) sin errores en la consola.
- [ ] `npm test` y `npm run test:e2e` en verde.
- [ ] Grabar el video siguiendo el guion (5 a 8 minutos).
- [ ] Decidir si se elimina `scripts/verification.js` (obsoleto).
- [ ] Unir la rama `fix/backend-flujo-ordenes` a `main` y subirla al repositorio.
- [ ] Confirmar que ningún `.env` quedó en el repositorio (`git ls-files | grep .env` solo debe mostrar `backend/.env.example`).
