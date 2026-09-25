import { ApolloContext, ConfirmOrderResult } from '../types';
import { findOrderById, transitionOrderStatus } from '../datasources/ordersRepository';
import { canTransition } from '../domain/orderStatus.stateMachine';
import { publishOrderStatusUpdate } from '../resolvers/subscription.resolvers';
import { invalidOrderStatusError, orderNotFoundError, unauthorizedError } from './errors';

// Despacho manual por un operador: APPROVED → DISPATCHED.
// El orderWorkflow también despacha automáticamente; lo que ocurra primero gana
// gracias a la transición condicional, y el otro no hace nada.
export async function confirmOrder(
  orderId: string,
  context: ApolloContext
): Promise<ConfirmOrderResult> {
  // 1. Solo administradores (rol simulado con el header x-demo-role: admin)
  if (context.user?.role !== 'admin') {
    return unauthorizedError('Admin privileges required to confirm orders');
  }

  // 2. La orden existe y la transición es válida
  const order = await findOrderById(orderId);
  if (!order) {
    return orderNotFoundError(orderId);
  }

  if (!canTransition(order.status, 'DISPATCHED')) {
    return invalidOrderStatusError(order.status, 'DISPATCHED');
  }

  // 3. Aplicar la transición solo si nadie cambió el estado mientras tanto
  const moved = await transitionOrderStatus(orderId, order.status, 'DISPATCHED');
  const updatedOrder = await findOrderById(orderId);
  if (!updatedOrder) {
    throw new Error(`Order ${orderId} disappeared while confirming it`);
  }

  if (!moved) {
    return invalidOrderStatusError(updatedOrder.status, 'DISPATCHED');
  }

  await publishOrderStatusUpdate(updatedOrder);

  console.log(`✅ Order ${orderId} dispatched`);

  return {
    __typename: 'ConfirmOrderSuccess',
    order: updatedOrder,
  };
}
