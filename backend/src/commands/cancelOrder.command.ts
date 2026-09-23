import { ApolloContext, CancelOrderResult } from '../types';
import { publishOrderStatusUpdate, publishMedicationStockUpdate } from '../resolvers/subscription.resolvers';

export async function cancelOrder(
  orderId: string,
  context: ApolloContext
): Promise<CancelOrderResult> {
  try {
    // 1. Verificar que la orden existe
    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        __typename: 'OrderNotFoundError',
        message: `Order ${orderId} not found`,
        code: 'ORDER_NOT_FOUND',
        orderId,
      };
    }

    // 2. Verificar que la orden no está ya cancelada o despachada
    if (order.status === 'CANCELLED') {
      return {
        __typename: 'InvalidOrderStatusError',
        message: 'Order is already cancelled',
        code: 'INVALID_ORDER_STATUS',
        currentStatus: order.status,
        attemptedStatus: 'CANCELLED',
      };
    }

    if (order.status === 'DISPATCHED') {
      return {
        __typename: 'InvalidOrderStatusError',
        message: 'Cannot cancel a dispatched order',
        code: 'INVALID_ORDER_STATUS',
        currentStatus: order.status,
        attemptedStatus: 'CANCELLED',
      };
    }

    // 3. Verificar permisos (solo el dueño o admin puede cancelar)
    const userId = context.user?.id || 'paciente-de-ejemplo-id';
    const isOwner = order.patient_id === userId;
    const isAdmin = userId === 'admin-id'; // Simulado para el taller
    
    if (!isOwner && !isAdmin) {
      return {
        __typename: 'ValidationError',
        message: 'You are not authorized to cancel this order',
        code: 'UNAUTHORIZED',
        field: 'orderId',
      };
    }

    // 4. Obtener items de la orden para restaurar stock
    const { data: orderItems, error: itemsError } = await context.supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw new Error('Failed to fetch order items');
    }

    // 5. Restaurar stock de medicamentos (transacción)
    for (const item of orderItems || []) {
      const { error: stockError } = await context.supabase.rpc(
        'increment_stock',
        {
          p_medication_id: item.medication_id,
          p_quantity: item.quantity,
        }
      );

      if (stockError) {
        console.error(`Error restoring stock for medication ${item.medication_id}:`, stockError);
        // Continuar con otros items incluso si uno falla
      } else {
        // Obtener medicamento actualizado para publicación
        const { data: medication, error: medError } = await context.supabase
          .from('medications')
          .select('*')
          .eq('id', item.medication_id)
          .single();

        if (!medError && medication) {
          await publishMedicationStockUpdate(item.medication_id, medication, context);
        }
      }
    }

    // 6. Actualizar estado a CANCELLED
    const { error: updateError } = await context.supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error cancelling order:', updateError);
      throw new Error('Failed to cancel order');
    }

    // 7. Obtener orden actualizada con relaciones
    const { data: updatedOrder, error: fetchError } = await context.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          medications (*)
        ),
        prescription_evidences (*)
      `)
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching cancelled order:', fetchError);
      throw new Error('Failed to fetch cancelled order');
    }

    // 8. Transformar respuesta
    const transformedOrder = {
      id: updatedOrder.id,
      status: updatedOrder.status,
      total: updatedOrder.total,
      createdAt: updatedOrder.created_at,
      updatedAt: updatedOrder.updated_at,
      items: updatedOrder.order_items.map((item: any) => ({
        id: item.id,
        medication: {
          id: item.medications.id,
          commercialName: item.medications.commercial_name,
          activeIngredient: item.medications.active_ingredient,
          laboratory: item.medications.laboratory,
          presentation: item.medications.presentation,
          price: item.medications.price,
          stock: item.medications.stock,
          requiresPrescription: item.medications.requires_prescription,
          indications: item.medications.indications,
          contraindications: item.medications.contraindications,
          createdAt: item.medications.created_at,
        },
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.quantity * item.unit_price,
        createdAt: item.created_at,
      })),
      prescriptionEvidence: updatedOrder.prescription_evidences?.[0] ? {
        id: updatedOrder.prescription_evidences[0].id,
        documentUrl: updatedOrder.prescription_evidences[0].document_url,
        validationStatus: updatedOrder.prescription_evidences[0].validation_status,
        validatedAt: updatedOrder.prescription_evidences[0].validated_at,
        createdAt: updatedOrder.prescription_evidences[0].created_at,
      } : null,
    };

    // 9. Publicar evento de actualización
    await publishOrderStatusUpdate(orderId, transformedOrder, context);

    console.log(`✅ Order ${orderId} cancelled`);
    
    return {
      __typename: 'CancelOrderSuccess',
      order: transformedOrder,
    };

  } catch (error) {
    console.error('Unexpected error in cancelOrder command:', error);
    
    return {
      __typename: 'ValidationError',
      message: 'An unexpected error occurred while cancelling the order',
      code: 'INTERNAL_ERROR',
    };
  }
}

// Necesitamos agregar la función increment_stock a la base de datos
// Esta función debería estar en el DDL de Supabase
/*
CREATE OR REPLACE FUNCTION increment_stock(
  p_medication_id uuid,
  p_quantity integer
)
RETURNS boolean AS $$
BEGIN
  UPDATE medications
  SET stock = stock + p_quantity
  WHERE id = p_medication_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
*/