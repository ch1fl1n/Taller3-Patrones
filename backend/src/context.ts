import { createCategoryLoader, createMedicationLoader, createPatientLoader, createOrderItemLoader } from './loaders/categoryLoader';
import { supabase } from './datasources/supabaseClient';
import { PubSub } from 'graphql-subscriptions';
import { ApolloContext } from './types';

// Crear instancia de PubSub para subscriptions
export const pubsub = new PubSub();

// Tipos de eventos para subscriptions
export const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED';
export const MEDICATION_STOCK_CHANGED = 'MEDICATION_STOCK_CHANGED';

// Paciente demo usado como usuario simulado (insertado por supabase/seed.sql)
export const DEMO_PATIENT_ID = '00000000-0000-0000-0000-000000000001';

// Header que simula el rol del usuario (la autenticación no es foco del taller).
// Con "x-demo-role: admin" se puede ejecutar confirmOrder.
const ROLE_HEADER = 'x-demo-role';

type Headers = Record<string, unknown>;

function buildContext(headers: Headers): ApolloContext {
  // Sin autenticación (decisión del taller): todo request es el paciente demo
  const role = headers[ROLE_HEADER] === 'admin' ? 'admin' : 'patient';

  return {
    user: {
      id: DEMO_PATIENT_ID,
      email: 'paciente@ejemplo.com',
      role,
    },
    // DataLoaders por request (evita fugas de caché entre usuarios)
    loaders: {
      categoryLoader: createCategoryLoader(),
      medicationLoader: createMedicationLoader(),
      patientLoader: createPatientLoader(),
      orderItemLoader: createOrderItemLoader(),
    },
    pubsub,
    supabase,
  };
}

// Contexto para queries y mutations (HTTP)
export async function createHttpContext({ req }: { req: { headers: Headers } }): Promise<ApolloContext> {
  return buildContext(req.headers);
}

// Contexto para subscriptions (WebSocket): los "headers" viajan en connectionParams
export async function createWsContext(ctx: { connectionParams?: Headers }): Promise<ApolloContext> {
  return buildContext(ctx.connectionParams ?? {});
}
