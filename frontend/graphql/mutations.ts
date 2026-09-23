import { gql } from '@apollo/client';

// Mutation para crear una orden
export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      __typename
      ... on CreateOrderSuccess {
        order {
          id
          status
          total
          createdAt
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
      ... on InsufficientStockError {
        message
        code
        medicationId
        medicationName
        availableStock
        requestedQuantity
      }
      ... on PrescriptionRequiredError {
        message
        code
        medicationIds
        medicationNames
      }
      ... on ValidationError {
        message
        code
        field
      }
    }
  }
`;

// Mutation para enviar evidencia de prescripción
export const SUBMIT_PRESCRIPTION_EVIDENCE = gql`
  mutation SubmitPrescriptionEvidence($input: SubmitPrescriptionInput!) {
    submitPrescriptionEvidence(input: $input) {
      __typename
      ... on SubmitPrescriptionSuccess {
        order {
          id
          status
          prescriptionEvidence {
            validationStatus
          }
        }
      }
      ... on OrderNotFoundError {
        message
        code
        orderId
      }
      ... on ValidationError {
        message
        code
        field
      }
    }
  }
`;

// Mutation para confirmar orden (admin)
export const CONFIRM_ORDER = gql`
  mutation ConfirmOrder($orderId: UUID!) {
    confirmOrder(orderId: $orderId) {
      __typename
      ... on ConfirmOrderSuccess {
        order {
          id
          status
          updatedAt
        }
      }
      ... on InvalidOrderStatusError {
        message
        code
        currentStatus
        attemptedStatus
      }
      ... on OrderNotFoundError {
        message
        code
        orderId
      }
      ... on ValidationError {
        message
        code
        field
      }
    }
  }
`;

// Mutation para cancelar orden
export const CANCEL_ORDER = gql`
  mutation CancelOrder($orderId: UUID!) {
    cancelOrder(orderId: $orderId) {
      __typename
      ... on CancelOrderSuccess {
        order {
          id
          status
        }
      }
      ... on InvalidOrderStatusError {
        message
        code
        currentStatus
        attemptedStatus
      }
      ... on OrderNotFoundError {
        message
        code
        orderId
      }
      ... on ValidationError {
        message
        code
        field
      }
    }
  }
`;