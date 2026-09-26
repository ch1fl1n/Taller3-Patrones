import { gql } from '@apollo/client';
import { ORDER_SUMMARY_FIELDS } from './fragments';

// Query para obtener medicamentos con filtros
export const GET_MEDICATIONS = gql`
  query GetMedications($filter: MedicationFilterInput) {
    medications(filter: $filter) {
      items {
        id
        commercialName
        activeIngredient
        price
        presentation
        laboratory
        requiresPrescription
        inStock
        category {
          id
          name
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalPages
        currentPage
      }
    }
  }
`;

// Query para obtener detalles de un medicamento
export const GET_MEDICATION_DETAILS = gql`
  query GetMedicationDetails($id: UUID!) {
    medication(id: $id) {
      id
      commercialName
      activeIngredient
      laboratory
      presentation
      price
      stock
      requiresPrescription
      indications
      contraindications
      category {
        id
        name
      }
      createdAt
    }
  }
`;

// Query para obtener una orden específica (proyección de lectura)
export const GET_ORDER = gql`
  query GetOrder($id: UUID!) {
    order(id: $id) {
      id
      status
      total
      createdAt
      updatedAt
      patient {
        id
        fullName
        email
      }
      items {
        id
        quantity
        unitPrice
        subtotal
        medication {
          id
          commercialName
          presentation
          price
          requiresPrescription
        }
      }
      prescriptionEvidence {
        id
        documentUrl
        validationStatus
        validatedAt
      }
    }
  }
`;

// Query para obtener órdenes del usuario actual
export const GET_MY_ORDERS = gql`
  ${ORDER_SUMMARY_FIELDS}
  query GetMyOrders {
    myOrders {
      ...OrderSummaryFields
    }
  }
`;

// Query para obtener categorías
export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      createdAt
    }
  }
`;

// Query para obtener información del usuario actual
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      fullName
      email
      createdAt
    }
  }
`;