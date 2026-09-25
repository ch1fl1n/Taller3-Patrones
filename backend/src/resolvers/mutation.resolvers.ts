import { ApolloContext } from '../types';
import { register, login } from '../commands/auth.commands';
import { createOrder } from '../commands/createOrder.command';
import { submitPrescriptionEvidence } from '../commands/submitPrescriptionEvidence.command';
import { confirmOrder } from '../commands/confirmOrder.command';
import { cancelOrder } from '../commands/cancelOrder.command';

export const mutationResolvers = {
  Mutation: {
    // Autenticación - Registro
    register: async (
      _: any,
      { input }: { input: any },
      context: ApolloContext
    ) => {
      try {
        const result = await register(input, context);
        return result;
      } catch (error) {
        console.error('Error in register mutation:', error);
        
        return {
          __typename: 'AuthError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },

    // Autenticación - Login
    login: async (
      _: any,
      { input }: { input: any },
      context: ApolloContext
    ) => {
      try {
        const result = await login(input, context);
        return result;
      } catch (error) {
        console.error('Error in login mutation:', error);
        
        return {
          __typename: 'AuthError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },

    // Crear una nueva orden
    createOrder: async (
      _: any,
      { input }: { input: any },
      context: ApolloContext
    ) => {
      try {
        const result = await createOrder(input, context);
        return result;
      } catch (error) {
        console.error('Error in createOrder mutation:', error);
        
        // Convertir error a formato GraphQL
        return {
          __typename: 'ValidationError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },

    // Enviar evidencia de prescripción médica
    submitPrescriptionEvidence: async (
      _: any,
      { input }: { input: any },
      context: ApolloContext
    ) => {
      try {
        const result = await submitPrescriptionEvidence(input, context);
        return result;
      } catch (error) {
        console.error('Error in submitPrescriptionEvidence mutation:', error);
        
        return {
          __typename: 'ValidationError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },

    // Confirmar orden
    confirmOrder: async (
      _: any,
      { orderId }: { orderId: string },
      context: ApolloContext
    ) => {
      try {
        const result = await confirmOrder(orderId, context);
        return result;
      } catch (error) {
        console.error('Error in confirmOrder mutation:', error);
        
        return {
          __typename: 'ValidationError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },

    // Cancelar orden
    cancelOrder: async (
      _: any,
      { orderId }: { orderId: string },
      context: ApolloContext
    ) => {
      try {
        const result = await cancelOrder(orderId, context);
        return result;
      } catch (error) {
        console.error('Error in cancelOrder mutation:', error);
        
        return {
          __typename: 'ValidationError',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'INTERNAL_ERROR',
        };
      }
    },
  },

  // Resolvers de tipos para unions
  AuthResult: {
    __resolveType(obj: any) {
      if (obj.token && obj.user) return 'AuthSuccess';
      if (obj.message && obj.code) return 'AuthError';
      return null;
    },
  },

  CreateOrderResult: {
    __resolveType(obj: any) {
      if (obj.order) return 'CreateOrderSuccess';
      if (obj.medicationId) return 'InsufficientStockError';
      if (obj.medicationIds) return 'PrescriptionRequiredError';
      if (obj.field || obj.code === 'VALIDATION_ERROR') return 'ValidationError';
      return null;
    },
  },

  SubmitPrescriptionResult: {
    __resolveType(obj: any) {
      if (obj.order) return 'SubmitPrescriptionSuccess';
      if (obj.orderId) return 'OrderNotFoundError';
      if (obj.field || obj.code === 'VALIDATION_ERROR') return 'ValidationError';
      return null;
    },
  },

  ConfirmOrderResult: {
    __resolveType(obj: any) {
      if (obj.order) return 'ConfirmOrderSuccess';
      if (obj.orderId) return 'OrderNotFoundError';
      if (obj.currentStatus) return 'InvalidOrderStatusError';
      if (obj.field || obj.code === 'VALIDATION_ERROR') return 'ValidationError';
      return null;
    },
  },

  CancelOrderResult: {
    __resolveType(obj: any) {
      if (obj.order) return 'CancelOrderSuccess';
      if (obj.orderId) return 'OrderNotFoundError';
      if (obj.currentStatus) return 'InvalidOrderStatusError';
      if (obj.field || obj.code === 'VALIDATION_ERROR') return 'ValidationError';
      return null;
    },
  },

  MutationError: {
    __resolveType(obj: any) {
      if (obj.medicationId) return 'InsufficientStockError';
      if (obj.medicationIds) return 'PrescriptionRequiredError';
      if (obj.orderId) return 'OrderNotFoundError';
      if (obj.currentStatus) return 'InvalidOrderStatusError';
      if (obj.field) return 'ValidationError';
      return 'ValidationError';
    },
  },
};