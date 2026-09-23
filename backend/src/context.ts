import { CreateContextFn } from '@apollo/server';
import { createCategoryLoader, createMedicationLoader, createPatientLoader, createOrderItemLoader } from './loaders/categoryLoader';
import { supabase } from './datasources/supabaseClient';
import { PubSub } from 'graphql-subscriptions';

// Crear instancia de PubSub para subscriptions
export const pubsub = new PubSub();

// Tipos de eventos para subscriptions
export const ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED';
export const MEDICATION_STOCK_CHANGED = 'MEDICATION_STOCK_CHANGED';

export interface Context {
  user?: {
    id: string;
    email: string;
  };
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
export const createContext: CreateContextFn<Context> = async ({ req }) => {
  try {
    // En un entorno real, aquí se validaría el token JWT del header
    // Para el taller, simulamos un usuario de ejemplo
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    let user: { id: string; email: string } | undefined;
    
    if (token) {
      // Simulación de validación de token
      // En producción usaríamos JWT o Supabase Auth
      user = {
        id: 'paciente-de-ejemplo-id',
        email: 'paciente@ejemplo.com',
      };
    } else {
      // Usuario anónimo (solo para desarrollo)
      user = {
        id: 'paciente-de-ejemplo-id',
        email: 'paciente@ejemplo.com',
      };
    }

    // Crear DataLoaders por request (evita fugas de caché entre usuarios)
    const loaders = {
      categoryLoader: createCategoryLoader(),
      medicationLoader: createMedicationLoader(),
      patientLoader: createPatientLoader(),
      orderItemLoader: createOrderItemLoader(),
    };

    return {
      user,
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