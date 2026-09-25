import { ApolloContext, CancelOrderResult, OrderStatus } from '../types';
import { DEMO_PATIENT_ID } from '../context';
import { findOrderById } from '../datasources/ordersRepository';
import { canTransition } from '../domain/orderStatus.stateMachine';
import { publishOrderStatusUpdate, publishMedicationStockUpdate } from '../resolvers/subscription.resolvers';
import {
  invalidOrderStatusError,
  orderNotFoundError,
  parseCommandError,
  unauthorizedError,
} from './errors';

export async function cancelOrder(
  orderId: string,
  context: ApolloContext
): Promise<CancelOrderResult> {
  // 1. La orden existe
  const order = await findOrderById(orderId);
  if (!order) {
    return orderNotFoundError(orderId);
  }

  // 2. Solo el dueño o un administrador pueden cancelar
  const userId = context.user?.id || DEMO_PATIENT_ID;
  if (order.patientId !== userId && context.user?.role !== 'admin') {
    return unauthorizedError('You are not authorized to cancel this order');
  }

  // 3. Máquina de estados: DISPATCHED y CANCELLED son finales
  if (!canTransition(order.status, 'CANCELLED')) {
    return invalidOrderStatusError(order.status, 'CANCELLED');
  }

  // 4. Comando atómico: cambia el estado y restaura el stock en una sola transacción.
  //    La función vuelve a validar el estado con la fila bloqueada.
  const { error } = await context.supabase.rpc('cancel_order', { p_order_id: orderId });

  if (error) {
    const { code, detail } = parseCommandError(error.message);
    if (code === 'ORDER_NOT_FOUND') {
      return orderNotFoundError(orderId);
    }
    if (code === 'INVALID_ORDER_STATUS' && detail) {
      return invalidOrderStatusError(detail as OrderStatus, 'CANCELLED');
    }
    throw new Error(`Failed to cancel order: ${error.message}`);
  }

  const cancelledOrder = await findOrderById(orderId);
  if (!cancelledOrder) {
    throw new Error(`Order ${orderId} disappeared while cancelling it`);
  }

  // 5. Publicar el nuevo estado y el stock restaurado
  await publishOrderStatusUpdate(cancelledOrder);
  for (const item of cancelledOrder.items) {
    if (item.medication) {
      await publishMedicationStockUpdate(item.medication);
    }
  }

  console.log(`✅ Order ${orderId} cancelled`);

  return {
    __typename: 'CancelOrderSuccess',
    order: cancelledOrder,
  };
}
