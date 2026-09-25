import { createCategoryLoader, createMedicationLoader, createPatientLoader, createOrderItemLoader } from './loaders/categoryLoader';
import { supabase } from './datasources/supabaseClient';
import { PubSub } from 'graphql-subscriptions';
import { authenticateUser, JWTPayload, generateExamplePatientToken, generateAdminToken } from './auth/jwt';

// Crear instancia de PubSub para subscriptions
export const pubsub = new PubSub();

// Tipos de eventos para subscriptions
export const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED';
export const MEDICATION_STOCK_CHANGED = 'MEDICATION_STOCK_CHANGED';

export interface Context {
  user?: JWTPayload;
  loaders: {
    categoryLoader: ReturnType<typeof createCategoryLoader>;
    medicationLoader: ReturnType<typeof createMedicationLoader>;
    patientLoader: ReturnType<typeof createPatientLoader>;
    orderItemLoader: ReturnType<typeof createOrderItemLoader>;
  };
  pubsub: PubSub;
  supabase: typeof supabase;
}

// Función para crear el contexto por request
export const createContext = async ({ req }: { req: any }): Promise<Context> => {
  try {
    // Autenticar usuario usando JWT
    const authHeader = req.headers.authorization;
    const user = authenticateUser(authHeader);

    // Crear DataLoaders por request (evita fugas de caché entre usuarios)
    const loaders = {
      categoryLoader: createCategoryLoader(),
      medicationLoader: createMedicationLoader(),
      patientLoader: createPatientLoader(),
      orderItemLoader: createOrderItemLoader(),
    };

    return {
      user: user || undefined,
      loaders,
      pubsub,
      supabase,
    };
  } catch (error) {
    console.error('Error creating context:', error);
    
    // Retornar contexto mínimo incluso si hay error
    return {
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
};

// Función para validar si el usuario está autenticado
export function requireAuth(context: Context): JWTPayload {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

// Función para validar si el usuario es administrador
export function requireAdmin(context: Context): JWTPayload {
  const user = requireAuth(context);
  
  if (user.role !== 'admin') {
    throw new Error('Admin privileges required');
  }
  
  return user;
}

// Función para validar si el usuario es paciente
export function requirePatient(context: Context): JWTPayload {
  const user = requireAuth(context);
  
  if (user.role !== 'patient') {
    throw new Error('Patient privileges required');
  }
  
  return user;
}

// Función para obtener tokens de ejemplo (para desarrollo)
export function getExampleTokens() {
  return {
    patient: generateExamplePatientToken(),
    admin: generateAdminToken(),
  };
}

// Función para publicar eventos de cambio de estado de orden
export async function publishOrderStatusChanged(order: any) {
  await pubsub.publish(ORDER_STATUS_CHANGED, {
    orderStatusChanged: order,
  });
}

// Función para publicar eventos de cambio de stock
export async function publishMedicationStockChanged(medication: any) {
  await pubsub.publish(MEDICATION_STOCK_CHANGED, {
    medicationStockChanged: medication,
  });
}

// Función para validar si el usuario está autenticado
export function requireAuth(context: Context) {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

// Función para validar si el usuario es administrador
export function requireAdmin(context: Context) {
  const user = requireAuth(context);
  // En producción, esto vendría de un claim del token JWT
  const isAdmin = user.email === 'admin@afirmativepill.com';
  
  if (!isAdmin) {
    throw new Error('Admin privileges required');
  }
  
  return user;
}

// Función para publicar eventos de cambio de estado de orden
export async function publishOrderStatusChanged(order: any) {
  await pubsub.publish(ORDER_STATUS_CHANGED, {
    orderStatusChanged: order,
  });
}

// Función para publicar eventos de cambio de stock
export async function publishMedicationStockChanged(medication: any) {
  await pubsub.publish(MEDICATION_STOCK_CHANGED, {
    medicationStockChanged: medication,
  });
}