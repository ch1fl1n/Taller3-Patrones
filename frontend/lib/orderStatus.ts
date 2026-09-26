export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'CANCELLED';
export type PrescriptionValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  DISPATCHED: 'Despachada',
  CANCELLED: 'Cancelada',
};

export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING_APPROVAL: 'badge-warning',
  APPROVED: 'badge-info',
  DISPATCHED: 'badge-success',
  CANCELLED: 'badge-error',
};

export const EVIDENCE_STATUS_LABEL: Record<PrescriptionValidationStatus, string> = {
  PENDING: 'En revisión',
  VALIDATED: 'Validada',
  REJECTED: 'Rechazada',
};

// Pasos del flujo normal, en orden (CANCELLED queda fuera de la línea de tiempo)
export const ORDER_FLOW: OrderStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'DISPATCHED'];

export function canCancel(status: OrderStatus) {
  return status === 'PENDING_APPROVAL' || status === 'APPROVED';
}
