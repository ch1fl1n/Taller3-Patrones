import { ApolloContext } from '../types';
import { DEMO_PATIENT_ID } from '../context';
import { getMedications, getMedicationById, getCategories } from '../queries/getMedications.query';
import { getOrderProjection } from '../queries/getOrderProjection.query';

export const queryResolvers = {
  Query: {
    // Catálogo de medicamentos con filtros
    medications: async (_: any, { filter }: { filter?: any }, context: ApolloContext) => {
      try {
        // La categoría NO se carga aquí: la resuelve el field resolver MedicationSummary.category
        // solo si el cliente la pide, y el DataLoader agrupa todos los ids en una sola consulta.
        const result = await getMedications({ filter });

        // Calcular información de paginación
        const currentPage = Math.floor((filter?.offset || 0) / (filter?.limit || 20)) + 1;
        const totalPages = Math.ceil(result.totalCount / (filter?.limit || 20));

        return {
          items: result.items,
          totalCount: result.totalCount,
          pageInfo: {
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
            totalPages,
            currentPage,
          },
        };
      } catch (error) {
        console.error('Error in medications query:', error);
        throw error;
      }
    },

    // Ficha detallada de medicamento
    medication: async (_: any, { id }: { id: string }) => {
      try {
        const medication = await getMedicationById(id);
        
        // La categoría la resuelve el field resolver Medication.category (DataLoader)
        return medication;
      } catch (error) {
        console.error(`Error fetching medication ${id}:`, error);
        return null;
      }
    },

    // Obtener orden específica
    order: async (_: any, { id }: { id: string }, context: ApolloContext) => {
      try {
        const order = await getOrderProjection(id);
        
        if (!order) {
          return null;
        }

        // Obtener paciente usando DataLoader
        const patient = await context.loaders.patientLoader.load(order.patientId);
        
        // Obtener items de orden usando DataLoader
        const items = await context.loaders.orderItemLoader.load(order.id);
        
        // Para cada item, obtener medicamento usando DataLoader
        const itemsWithMedication = await Promise.all(
          items.map(async (item: any) => {
            const medication = await context.loaders.medicationLoader.load(item.medicationId);
            return {
              ...item,
              medication,
              subtotal: item.quantity * item.unitPrice,
            };
          })
        );

        return {
          ...order,
          patient,
          items: itemsWithMedication,
        };
      } catch (error) {
        console.error(`Error fetching order ${id}:`, error);
        return null;
      }
    },

    // Órdenes del usuario actual (simulado para el taller)
    myOrders: async (_: any, __: any, context: ApolloContext) => {
      try {
        // En un entorno real, esto usaría el ID del usuario autenticado
        const userId = context.user?.id || DEMO_PATIENT_ID;
        
        // Consultar órdenes del paciente
        const { data: orders, error } = await context.supabase
          ?.from('orders')
          .select('*')
          .eq('patient_id', userId)
          .order('created_at', { ascending: false }) || { data: null, error: null };

        if (error) {
          console.error('Error fetching user orders:', error);
          throw error;
        }

        if (!orders || orders.length === 0) {
          return [];
        }

        // Procesar cada orden
        const processedOrders = await Promise.all(
          orders.map(async (order: any) => {
            const patient = await context.loaders.patientLoader.load(order.patient_id);
            const items = await context.loaders.orderItemLoader.load(order.id);
            
            const itemsWithMedication = await Promise.all(
              items.map(async (item: any) => {
                const medication = await context.loaders.medicationLoader.load(item.medicationId);
                return {
                  ...item,
                  medication,
                  subtotal: item.quantity * item.unitPrice,
                };
              })
            );

            return {
              id: order.id,
              status: order.status,
              total: order.total,
              patient,
              items: itemsWithMedication,
              createdAt: order.created_at,
              updatedAt: order.updated_at,
            };
          })
        );

        return processedOrders;
      } catch (error) {
        console.error('Error in myOrders query:', error);
        throw error;
      }
    },

    // Categorías disponibles
    categories: async () => {
      try {
        return await getCategories();
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },

    // Información del usuario actual (simulado)
    me: async (_: any, __: any, context: ApolloContext) => {
      try {
        // Sin autenticación: el usuario actual es siempre el paciente demo
        const userId = context.user?.id || DEMO_PATIENT_ID;
        
        const patient = await context.loaders.patientLoader.load(userId);
        
        if (!patient) {
          // Crear paciente de ejemplo si no existe
          const { data: newPatient, error } = await context.supabase
            ?.from('patients')
            .insert({
              id: userId,
              full_name: 'Juan Pérez',
              email: 'paciente@ejemplo.com',
            })
            .select()
            .single() || { data: null, error: null };

          if (error) {
            console.error('Error creating example patient:', error);
            throw error;
          }

          return newPatient ? {
            id: newPatient.id,
            fullName: newPatient.full_name,
            email: newPatient.email,
            createdAt: newPatient.created_at,
          } : null;
        }

        return patient;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
      }
    },
  },

  // Resolvers de tipos
  Medication: {
    category: async (parent: any, _: any, context: ApolloContext) => {
      if (!parent.categoryId) {
        return null;
      }
      return await context.loaders.categoryLoader.load(parent.categoryId);
    },
  },

  MedicationSummary: {
    category: async (parent: any, _: any, context: ApolloContext) => {
      if (!parent.categoryId) {
        return null;
      }
      return await context.loaders.categoryLoader.load(parent.categoryId);
    },
  },

  OrderItem: {
    medication: async (parent: any, _: any, context: ApolloContext) => {
      return await context.loaders.medicationLoader.load(parent.medicationId);
    },
    subtotal: (parent: any) => {
      return parent.quantity * parent.unitPrice;
    },
  },
};