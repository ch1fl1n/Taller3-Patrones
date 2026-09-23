import { ApolloContext, ConfirmOrderResult } from '../types';
import { publishOrderStatusUpdate } from '../resolvers/subscription.resolvers';

export async function confirmOrder(
  orderId: string,
  context: ApolloContext
): Promise<ConfirmOrderResult> {
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

    // 2. Verificar que la orden está en estado APPROVED
    if (order.status !== 'APPROVED') {
      return {
        __typename: 'InvalidOrderStatusError',
        message: `Order is in ${order.status} status, can only confirm orders in APPROVED status`,
        code: 'INVALID_ORDER_STATUS',
        currentStatus: order.status,
        attemptedStatus: 'DISPATCHED',
      };
    }

    // 3. Verificar permisos (solo admin puede confirmar órdenes)
    // En producción usaríamos requireAdmin(context)
    const userId = context.user?.id;
    const isAdmin = userId === 'admin-id'; // Simulado para el taller
    
    if (!isAdmin) {
      return {
        __typename: 'ValidationError',
        message: 'Admin privileges required to confirm orders',
        code: 'UNAUTHORIZED',
        field: 'orderId',
      };
    }

    // 4. Actualizar estado a DISPATCHED
    const { error: updateError } = await context.supabase
      .from('orders')
      .update({ status: 'DISPATCHED' })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error confirming order:', updateError);
      throw new Error('Failed to confirm order');
    }

    // 5. Obtener orden actualizada con relaciones
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
      console.error('Error fetching confirmed order:', fetchError);
      throw new Error('Failed to fetch confirmed order');
    }

    // 6. Transformar respuesta
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

    // 7. Publicar evento de actualización
    await publishOrderStatusUpdate(orderId, transformedOrder, context);

    console.log(`✅ Order ${orderId} confirmed (status: DISPATCHED)`);
    
    return {
      __typename: 'ConfirmOrderSuccess',
      order: transformedOrder,
    };

  } catch (error) {
    console.error('Unexpected error in confirmOrder command:', error);
    
    return {
      __typename: 'ValidationError',
      message: 'An unexpected error occurred while confirming the order',
      code: 'INTERNAL_ERROR',
    };
  }
}