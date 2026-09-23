import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Configuración del servidor GraphQL
const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';
const WS_ENDPOINT = 'ws://localhost:4000/graphql';

// Link HTTP para queries y mutations
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  headers: {
    // En producción, aquí iría el token JWT de autenticación
    'Authorization': 'Bearer ejemplo-token',
  },
});

// Link WebSocket para subscriptions
const wsLink = typeof window !== 'undefined' 
  ? new GraphQLWsLink(
      createClient({
        url: WS_ENDPOINT,
        connectionParams: {
          // En producción, aquí irían los parámetros de autenticación
          authToken: 'ejemplo-token',
        },
      })
    )
  : null;

// Split link: usar WebSocket para subscriptions, HTTP para lo demás
const splitLink = typeof window !== 'undefined' && wsLink != null
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink
    )
  : httpLink;

// Configuración de la caché de Apollo
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        medications: {
          keyArgs: ['filter'],
          merge(existing = { items: [], totalCount: 0 }, incoming) {
            return {
              ...incoming,
              items: [...(existing.items || []), ...(incoming.items || [])],
            };
          },
        },
      },
    },
    Medication: {
      keyFields: ['id'],
    },
    Order: {
      keyFields: ['id'],
      fields: {
        items: {
          merge(existing = [], incoming) {
            return incoming;
          },
        },
      },
    },
  },
});

// Crear cliente Apollo
export const client = new ApolloClient({
  link: splitLink,
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Función auxiliar para crear headers de autenticación
export function getAuthHeaders() {
  // En producción, obtendríamos el token del almacenamiento local
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;
  
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Función para actualizar caché después de mutaciones
export function updateCacheAfterMutation<T>(cache: InMemoryCache, query: any, newData: T) {
  cache.updateQuery(query, (existingData) => {
    if (!existingData) return { ...newData };
    return { ...existingData, ...newData };
  });
}