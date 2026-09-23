import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useServer } from 'graphql-ws/lib/use/ws';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { readFileSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Importar context y resolvers
import { createContext } from './context';
import { queryResolvers } from './resolvers/query.resolvers';
import { mutationResolvers } from './resolvers/mutation.resolvers';
import { subscriptionResolvers } from './resolvers/subscription.resolvers';

// Cargar variables de entorno
dotenv.config();

// Leer schema GraphQL
const typeDefs = readFileSync(
  path.join(__dirname, 'schema', 'schema.graphql'),
  'utf-8'
);

// Crear schema ejecutable
const schema = makeExecutableSchema({
  typeDefs,
  resolvers: {
    ...queryResolvers,
    ...mutationResolvers,
    ...subscriptionResolvers,
  },
});

// Crear aplicación Express
const app = express();
app.use(express.json());

// Configurar CORS
app.use(cors());

// Crear servidor HTTP
const httpServer = http.createServer(app);

// Crear servidor WebSocket para subscriptions
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

// Configurar servidor WebSocket
const serverCleanup = useServer(
  {
    schema,
    context: createContext,
  },
  wsServer
);

// Crear servidor Apollo
const server = new ApolloServer({
  schema,
  plugins: [
    // Plugin para drenar el servidor HTTP
    ApolloServerPluginDrainHttpServer({ httpServer }),
    
    // Plugin para limpiar servidor WebSocket
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
    
    // Plugin para logging
    {
      async requestDidStart() {
        return {
          async didResolveOperation(context) {
            const operationName = context.operationName || 'anonymous';
            console.log(`[GraphQL] ${operationName} operation started`);
          },
          
          async willSendResponse(context) {
            const operationName = context.operationName || 'anonymous';
            console.log(`[GraphQL] ${operationName} operation completed`);
          },
          
          async didEncounterErrors(context) {
            console.error('[GraphQL] Errors encountered:', context.errors);
          },
        };
      },
    },
  ],
});

// Iniciar servidor
async function startServer() {
  try {
    // Iniciar servidor Apollo
    await server.start();
    
    // Configurar middleware Express
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: createContext,
      })
    );

    // Ruta de salud
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'afirmative-pill-graphql',
        version: '1.0.0',
      });
    });

    // Ruta principal
    app.get('/', (req, res) => {
      res.redirect('/graphql');
    });

    // Iniciar servidor HTTP
    const PORT = process.env.PORT || 4000;
    
    await new Promise<void>((resolve) => {
      httpServer.listen({ port: PORT }, resolve);
    });

    console.log(`🚀 Servidor GraphQL listo en http://localhost:${PORT}/graphql`);
    console.log(`🔌 Subscriptions disponibles en ws://localhost:${PORT}/graphql`);
    console.log(`🏥 Health check en http://localhost:${PORT}/health`);
    
    // Manejar cierre limpio
    process.on('SIGTERM', async () => {
      console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
      await server.stop();
      httpServer.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
      await server.stop();
      httpServer.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor si este archivo es ejecutado directamente
if (require.main === module) {
  startServer().catch(console.error);
}

export { server, startServer };