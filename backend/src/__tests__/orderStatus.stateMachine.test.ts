import { canTransition, isFinalStatus } from '../domain/orderStatus.stateMachine';
import { OrderStatus } from '../types';

describe('máquina de estados de la orden', () => {
  it.each<[OrderStatus, OrderStatus]>([
    ['PENDING_APPROVAL', 'APPROVED'],
    ['PENDING_APPROVAL', 'CANCELLED'],
    ['APPROVED', 'DISPATCHED'],
    ['APPROVED', 'CANCELLED'],
  ])('permite %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each<[OrderStatus, OrderStatus]>([
    ['PENDING_APPROVAL', 'DISPATCHED'], // no se puede despachar sin aprobar
    ['APPROVED', 'PENDING_APPROVAL'], // no se retrocede
    ['DISPATCHED', 'CANCELLED'], // lo despachado no se cancela
    ['CANCELLED', 'APPROVED'], // lo cancelado no revive (invariante 3 del planning)
    ['CANCELLED', 'CANCELLED'],
  ])('rechaza %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('DISPATCHED y CANCELLED son estados finales', () => {
    expect(isFinalStatus('DISPATCHED')).toBe(true);
    expect(isFinalStatus('CANCELLED')).toBe(true);
    expect(isFinalStatus('PENDING_APPROVAL')).toBe(false);
    expect(isFinalStatus('APPROVED')).toBe(false);
  });
});
