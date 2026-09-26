import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// Configuración del servidor GraphQL (único endpoint: HTTP para queries/mutations, WS para subscriptions)
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
const WS_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql';

// Sin autenticación: el backend trata cada request como el paciente demo (ver backend/src/context.ts)

// Link HTTP para queries y mutations
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
});

// Link WebSocket para subscriptions
const wsLink = typeof window !== 'undefined'
  ? new GraphQLWsLink(
      createClient({
        url: WS_ENDPOINT,
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

// Configuración de la caché de Apollo.
// Query.medications no necesita política propia: cada combinación de filtro (incluido
// offset/limit) se guarda por separado, así que cada página es una entrada independiente.
const cache = new InMemoryCache({
  typePolicies: {
    Medication: {
      keyFields: ['id'],
    },
    Order: {
      keyFields: ['id'],
      fields: {
        // Los ítems de una orden no cambian: se reemplaza la lista entera
        items: { merge: false },
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

