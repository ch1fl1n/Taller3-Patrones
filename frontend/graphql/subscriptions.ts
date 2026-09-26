import { gql } from '@apollo/client';

// Subscription para seguir cambios de estado de una orden.
// Order y PrescriptionEvidence están normalizados por id, así que cada evento
// actualiza la caché y todas las vistas que muestran la orden se refrescan solas.
export const ORDER_STATUS_CHANGED = gql`
  subscription OrderStatusChanged($orderId: UUID!) {
    orderStatusChanged(orderId: $orderId) {
      id
      status
      updatedAt
      prescriptionEvidence {
        id
        documentUrl
        validationStatus
        validatedAt
      }
    }
  }
`;

// Subscription para monitorear cambios de stock (admin)
export const MEDICATION_STOCK_CHANGED = gql`
  subscription MedicationStockChanged($medicationId: UUID!) {
    medicationStockChanged(medicationId: $medicationId) {
      id
      commercialName
      stock
      price
      requiresPrescription
    }
  }
`;
