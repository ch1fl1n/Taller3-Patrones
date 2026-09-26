import { gql } from '@apollo/client';

// Campos de una orden que usan el listado "Mis órdenes" y el checkout.
// Compartirlos permite que createOrder escriba la orden nueva directo en la caché de myOrders.
export const ORDER_SUMMARY_FIELDS = gql`
  fragment OrderSummaryFields on Order {
    id
    status
    total
    createdAt
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
        stock
      }
    }
    prescriptionEvidence {
      id
      validationStatus
    }
  }
`;
