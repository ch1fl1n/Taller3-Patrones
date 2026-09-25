import { ApolloContext } from '../types';
import { createOrder } from '../commands/createOrder.command';
import { submitPrescriptionEvidence } from '../commands/submitPrescriptionEvidence.command';
import { confirmOrder } from '../commands/confirmOrder.command';
import { cancelOrder } from '../commands/cancelOrder.command';

function resolveByTypename(obj: { __typename: string }) {
  return obj.__typename;
}

export const mutationResolvers = {
  Mutation: {
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

  // Resolvers de tipos para unions/interface: los comandos devuelven siempre __typename
  CreateOrderResult: { __resolveType: resolveByTypename },
  SubmitPrescriptionResult: { __resolveType: resolveByTypename },
  ConfirmOrderResult: { __resolveType: resolveByTypename },
  CancelOrderResult: { __resolveType: resolveByTypename },
  MutationError: { __resolveType: resolveByTypename },
};
