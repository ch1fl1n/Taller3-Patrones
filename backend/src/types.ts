// Tipos para el schema GraphQL
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PubSub } from 'graphql-subscriptions';

export interface MedicationFilterInput {
  search?: string;
  categoryId?: string;
  activeIngredient?: string;
  requiresPrescription?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}

export interface OrderItemInput {
  medicationId: string;
  quantity: number;
}

export interface PrescriptionEvidenceInput {
  documentUrl: string;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  // Obligatoria si algún ítem requiere fórmula médica
  prescriptionEvidence?: PrescriptionEvidenceInput | null;
}

export interface SubmitPrescriptionInput {
  orderId: string;
  evidence: PrescriptionEvidenceInput;
}

// Tipos de error
export interface MutationError {
  message: string;
  code: string;
}

export interface ValidationError extends MutationError {
  __typename: 'ValidationError';
  field?: string;
}

export interface InsufficientStockError extends MutationError {
  __typename: 'InsufficientStockError';
  medicationId: string;
  medicationName: string;
  availableStock: number;
  requestedQuantity: number;
}

export interface PrescriptionRequiredError extends MutationError {
  __typename: 'PrescriptionRequiredError';
  medicationIds: string[];
  medicationNames: string[];
}

export interface OrderNotFoundError extends MutationError {
  __typename: 'OrderNotFoundError';
  orderId: string;
}

export interface InvalidOrderStatusError extends MutationError {
  __typename: 'InvalidOrderStatusError';
  currentStatus: OrderStatus;
  attemptedStatus: OrderStatus;
}

// Tipos de éxito
export interface CreateOrderSuccess {
  __typename: 'CreateOrderSuccess';
  order: Order;
}

export interface SubmitPrescriptionSuccess {
  __typename: 'SubmitPrescriptionSuccess';
  order: Order;
}

export interface ConfirmOrderSuccess {
  __typename: 'ConfirmOrderSuccess';
  order: Order;
}

export interface CancelOrderSuccess {
  __typename: 'CancelOrderSuccess';
  order: Order;
}

// Unions
export type CreateOrderResult =
  | CreateOrderSuccess
  | ValidationError
  | InsufficientStockError
  | PrescriptionRequiredError;

export type SubmitPrescriptionResult =
  | SubmitPrescriptionSuccess
  | ValidationError
  | OrderNotFoundError
  | InvalidOrderStatusError;

export type ConfirmOrderResult =
  | ConfirmOrderSuccess
  | ValidationError
  | OrderNotFoundError
  | InvalidOrderStatusError;

export type CancelOrderResult =
  | CancelOrderSuccess
  | ValidationError
  | OrderNotFoundError
  | InvalidOrderStatusError;

// Tipos de dominio
export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'CANCELLED';

export type PrescriptionValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  commercialName: string;
  activeIngredient: string;
  categoryId: string | null;
  laboratory: string;
  presentation: string;
  price: number;
  stock: number;
  requiresPrescription: boolean;
  indications: string | null;
  contraindications: string | null;
  createdAt: string;
}

export interface MedicationSummary {
  id: string;
  commercialName: string;
  activeIngredient: string;
  category: Category;
  price: number;
  presentation: string;
  laboratory: string;
  requiresPrescription: boolean;
  inStock: boolean;
}

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  medicationId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  medication?: Medication;
}

export interface Order {
  id: string;
  patientId: string;
  patient?: Patient;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  prescriptionEvidence?: PrescriptionEvidence | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionEvidence {
  id: string;
  orderId: string;
  documentUrl: string;
  validationStatus: PrescriptionValidationStatus;
  validatedAt: string | null;
  createdAt: string;
}

// Contexto de Apollo
export interface ApolloContext {
  user?: {
    id: string;
    email: string;
    role: 'patient' | 'admin';
  };
  loaders: {
    categoryLoader: any;
    medicationLoader: any;
    patientLoader: any;
    orderItemLoader: any;
  };
  pubsub: PubSub;
  supabase: SupabaseClient;
}
