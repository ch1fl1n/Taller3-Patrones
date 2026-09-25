import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Configuración del servidor GraphQL
const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';
const WS_ENDPOINT = 'ws://localhost:4000/graphql';

// Función para crear link HTTP con headers de autenticación dinámicos
const createHttpLink = () => {
  return new HttpLink({
    uri: GRAPHQL_ENDPOINT,
    headers: getAuthHeaders(),
  });
};

// Link HTTP inicial
const httpLink = createHttpLink();

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

// Función para actualizar headers de autenticación
export function updateAuthToken(token: string | null) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
  
  // Recrear el cliente Apollo con nuevos headers
  // Nota: En producción, necesitarías reiniciar la aplicación o usar Apollo Link dinámico
  console.log('Auth token updated. Please refresh the page for changes to take effect.');
}

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
  // Obtener token del almacenamiento local
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;
  
  // Para desarrollo, si no hay token, usar token de ejemplo
  if (!token && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const exampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYWNpZW50ZS1kZS1lamVtcGxvLWlkIiwiZW1haWwiOiJwYWNpZW50ZUBlamVtcGxvLmNvbSIsInJvbGUiOiJwYXRpZW50IiwicGF0aWVudElkIjoicGFjaWVudGUtZGUtZWplbXBsby1pZCIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwNjA0Nzk5LCJpc3MiOiJhZmlybWF0aXZlLXBpbGwtYmFja2VuZCIsImF1ZCI6ImFmaXJtYXRpdmUtcGlsbC1mcm9udGVuZCJ9.example-signature';
    return { Authorization: `Bearer ${exampleToken}` };
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Función para actualizar caché después de mutaciones
export function updateCacheAfterMutation<T>(cache: InMemoryCache, query: any, newData: T) {
  cache.updateQuery(query, (existingData) => {
    if (!existingData) return { ...newData };
    return { ...existingData, ...newData };
  });
}