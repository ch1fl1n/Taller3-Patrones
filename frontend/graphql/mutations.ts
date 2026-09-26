import { gql } from '@apollo/client';
import { ORDER_SUMMARY_FIELDS } from './fragments';

// Mutation para crear una orden
export const CREATE_ORDER = gql`
  ${ORDER_SUMMARY_FIELDS}
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      __typename
      ... on CreateOrderSuccess {
        order {
          ...OrderSummaryFields
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

// Mutation para reenviar evidencia de prescripción (p. ej. tras un rechazo)
export const SUBMIT_PRESCRIPTION_EVIDENCE = gql`
  mutation SubmitPrescriptionEvidence($input: SubmitPrescriptionInput!) {
    submitPrescriptionEvidence(input: $input) {
      __typename
      ... on SubmitPrescriptionSuccess {
        order {
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
      ... on OrderNotFoundError {
        message
        code
        orderId
      }
      ... on InvalidOrderStatusError {
        message
        code
        currentStatus
        attemptedStatus
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
          updatedAt
          items {
            id
            medication {
              id
              stock
            }
          }
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
