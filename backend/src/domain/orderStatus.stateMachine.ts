import { OrderStatus } from '../types';

// Máquina de estados de la orden (invariante 3 del planning.md).
// PENDING_APPROVAL → APPROVED → DISPATCHED, y CANCELLED desde cualquier estado no final.
// La función SQL cancel_order aplica la misma regla dentro de la transacción.
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
