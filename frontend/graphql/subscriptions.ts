import { gql } from '@apollo/client';

// Subscription para seguir cambios de estado de una orden
export const ORDER_STATUS_CHANGED = gql`
  subscription OrderStatusChanged($orderId: UUID!) {
    orderStatusChanged(orderId: $orderId) {
      id
      status
      total
      updatedAt
      items {
        id
        quantity
        unitPrice
        subtotal
        medication {
          id
          commercialName
          price
        }
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