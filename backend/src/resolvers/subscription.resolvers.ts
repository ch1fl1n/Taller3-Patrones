import { ApolloContext, Medication, Order } from '../types';
import { pubsub, ORDER_STATUS_CHANGED, MEDICATION_STOCK_CHANGED } from '../context';

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

// Función para publicar actualizaciones de estado de orden.
// Usa el pubsub global para poder publicar también desde procesos asíncronos (orderWorkflow).
export async function publishOrderStatusUpdate(order: Order) {
  await pubsub.publish(`${ORDER_STATUS_CHANGED}_${order.id}`, {
    orderStatusChanged: order,
  });

  console.log(`📢 Published order status update for order ${order.id} (${order.status})`);
}

// Función para publicar actualizaciones de stock
export async function publishMedicationStockUpdate(medication: Medication) {
  await pubsub.publish(`${MEDICATION_STOCK_CHANGED}_${medication.id}`, {
    medicationStockChanged: medication,
  });

  console.log(`📢 Published stock update for medication ${medication.id}`);
}
