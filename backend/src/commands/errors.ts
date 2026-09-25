import {
  InsufficientStockError,
  InvalidOrderStatusError,
  Medication,
  OrderNotFoundError,
  OrderStatus,
  ValidationError,
} from '../types';

// Constructores de los errores tipados que devuelven los comandos (payloads de la union)

export function validationError(message: string, field?: string, code = 'VALIDATION_ERROR'): ValidationError {
  return { __typename: 'ValidationError', message, code, field };
}

export function unauthorizedError(message: string): ValidationError {
  return validationError(message, 'orderId', 'UNAUTHORIZED');
}

export function orderNotFoundError(orderId: string): OrderNotFoundError {
  return {
    __typename: 'OrderNotFoundError',
    message: `Order ${orderId} not found`,
    code: 'ORDER_NOT_FOUND',
    orderId,
  };
}

export function invalidOrderStatusError(
  currentStatus: OrderStatus,
  attemptedStatus: OrderStatus,
  message = `Cannot move order from ${currentStatus} to ${attemptedStatus}`
): InvalidOrderStatusError {
  return {
    __typename: 'InvalidOrderStatusError',
    message,
    code: 'INVALID_ORDER_STATUS',
    currentStatus,
    attemptedStatus,
  };
}

export function insufficientStockError(medication: Medication, requestedQuantity: number): InsufficientStockError {
  return {
    __typename: 'InsufficientStockError',
    message: `Insufficient stock for ${medication.commercialName}`,
    code: 'INSUFFICIENT_STOCK',
    medicationId: medication.id,
    medicationName: medication.commercialName,
    availableStock: medication.stock,
    requestedQuantity,
  };
}

// Las funciones SQL señalan violaciones de reglas con mensajes "CODIGO" o "CODIGO:detalle"
export function parseCommandError(message: string): { code: string; detail?: string } {
  const [code, ...rest] = message.split(':');
  return { code, detail: rest.length > 0 ? rest.join(':') : undefined };
}
