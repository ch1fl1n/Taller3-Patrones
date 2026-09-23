import { ApolloContext } from '../types';
import { ORDER_STATUS_CHANGED, MEDICATION_STOCK_CHANGED } from '../context';

export const subscriptionResolvers = {
  Subscription: {
    // Seguimiento de cambios en estado de orden
    orderStatusChanged: {
      subscribe: async (
        _: any,
        { orderId }: { orderId: string },
        context: ApolloContext
      ) => {
        try {
          // Verificar que la orden existe
          const { data: order, error } = await context.supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

          if (error || !order) {
            throw new Error(`Order ${orderId} not found`);
          }

          // Verificar permisos (en producción sería más estricto)
          if (context.user && order.patient_id !== context.user.id) {
            // En producción, verificar si es admin o tiene permisos
            console.warn(`User ${context.user.id} attempting to subscribe to order ${orderId} owned by ${order.patient_id}`);
          }

          // Suscribirse al canal específico de la orden
          return context.pubsub.asyncIterator([`${ORDER_STATUS_CHANGED}_${orderId}`]);
        } catch (error) {
          console.error(`Error subscribing to order ${orderId}:`, error);
          throw error;
        }
      },
      
      resolve: (payload: any) => {
        return payload.orderStatusChanged;
      },
    },

    // Actualizaciones de stock (admin)
    medicationStockChanged: {
      subscribe: async (
        _: any,
        { medicationId }: { medicationId: string },
        context: ApolloContext
      ) => {
        try {
          // Verificar que el medicamento existe
          const { data: medication, error } = await context.supabase
            .from('medications')
            .select('*')
            .eq('id', medicationId)
            .single();

          if (error || !medication) {
            throw new Error(`Medication ${medicationId} not found`);
          }

          // Suscribirse al canal específico del medicamento
          return context.pubsub.asyncIterator([`${MEDICATION_STOCK_CHANGED}_${medicationId}`]);
        } catch (error) {
          console.error(`Error subscribing to medication ${medicationId}:`, error);
          throw error;
        }
      },
      
      resolve: (payload: any) => {
        return payload.medicationStockChanged;
      },
    },
  },
};

// Función para publicar actualizaciones de estado de orden
export async function publishOrderStatusUpdate(
  orderId: string,
  order: any,
  context: ApolloContext
) {
  await context.pubsub.publish(`${ORDER_STATUS_CHANGED}_${orderId}`, {
    orderStatusChanged: {
      ...order,
      // Asegurar que los campos estén en el formato correcto
      id: order.id,
      status: order.status,
      total: order.total,
      items: order.items || [],
      patient: order.patient || null,
      prescriptionEvidence: order.prescriptionEvidence || null,
      createdAt: order.created_at || order.createdAt,
      updatedAt: order.updated_at || order.updatedAt,
    },
  });
  
  console.log(`📢 Published order status update for order ${orderId}`);
}

// Función para publicar actualizaciones de stock
export async function publishMedicationStockUpdate(
  medicationId: string,
  medication: any,
  context: ApolloContext
) {
  await context.pubsub.publish(`${MEDICATION_STOCK_CHANGED}_${medicationId}`, {
    medicationStockChanged: {
      ...medication,
      // Asegurar que los campos estén en el formato correcto
      id: medication.id,
      commercialName: medication.commercial_name || medication.commercialName,
      activeIngredient: medication.active_ingredient || medication.activeIngredient,
      price: medication.price,
      stock: medication.stock,
      requiresPrescription: medication.requires_prescription || medication.requiresPrescription,
      indications: medication.indications,
      contraindications: medication.contraindications,
      createdAt: medication.created_at || medication.createdAt,
    },
  });
  
  console.log(`📢 Published stock update for medication ${medicationId}`);
}