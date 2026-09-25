// Tipos para el schema GraphQL

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

export interface CreateOrderInput {
  items: OrderItemInput[];
}

export interface PrescriptionEvidenceInput {
  documentUrl: string;
}

export interface SubmitPrescriptionInput {
  orderId: string;
  evidence: PrescriptionEvidenceInput;
}

// Tipos de autenticación
export interface AuthInput {
  email: string;
  fullName?: string;
  role?: string;
}

export interface AuthSuccess {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    patientId?: string;
  };
}

export interface AuthError {
  message: string;
  code: string;
}

export type AuthResult = AuthSuccess | AuthError;

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'patient' | 'admin' | 'pharmacist';
  patientId?: string;
}

// Tipos de error
export interface MutationError {
  message: string;
  code: string;
}

export interface ValidationError extends MutationError {
  field?: string;
}

export interface InsufficientStockError extends MutationError {
  medicationId: string;
  medicationName: string;
  availableStock: number;
  requestedQuantity: number;
}

export interface PrescriptionRequiredError extends MutationError {
  medicationIds: string[];
  medicationNames: string[];
}

export interface OrderNotFoundError extends MutationError {
  orderId: string;
}

export interface InvalidOrderStatusError extends MutationError {
  currentStatus: OrderStatus;
  attemptedStatus: OrderStatus;
}

// Tipos de éxito
export interface CreateOrderSuccess {
  order: Order;
}

export interface SubmitPrescriptionSuccess {
  order: Order;
}

export interface ConfirmOrderSuccess {
  order: Order;
}

export interface CancelOrderSuccess {
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
  | OrderNotFoundError;

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
  createdAt: string;
  medication?: Medication;
}

export interface Order {
  id: string;
  patientId: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  prescriptionEvidence?: PrescriptionEvidence;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionEvidence {
  id: string;
  orderId: string;
  documentUrl: string;
  validationStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
  validatedAt: string | null;
  createdAt: string;
}

// Contexto de Apollo
export interface ApolloContext {
  user?: JWTPayload;
  loaders: {
    categoryLoader: any;
    medicationLoader: any;
    patientLoader: any;
    orderItemLoader: any;
  };
  pubsub: any;
  supabase: any;
}