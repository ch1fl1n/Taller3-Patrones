# Instrucciones de Ejecución - Afirmative Pill

## Requisitos Previos

- Node.js 18+
- Cuenta de [Supabase](https://supabase.com/)
- Git

## Configuración del Proyecto

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd Taller3-Patrones
```

### 2. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com/)
2. Ir a "SQL Editor" y ejecutar el DDL:
   ```sql
   -- Copiar y pegar el contenido de scripts/supabase_ddl.sql
   ```
3. Obtener las credenciales de la base de datos:
   - `SUPABASE_URL` (en Settings > Database > Connection String)
   - `SUPABASE_ANON_KEY` (en Settings > API > Project API keys)
   - `SUPABASE_SERVICE_ROLE_KEY` (en Settings > API > Project API keys)

### 3. Configurar Backend

```bash
cd backend
cp .env.example .env
```

Editar el archivo `.env` con las credenciales de Supabase:
```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
PORT=4000
NODE_ENV=development
```

Instalar dependencias:
```bash
npm install
```

### 4. Cargar Datos de Prueba

```bash
npm run seed
```

Este comando cargará el dataset de 50 medicamentos en la base de datos.

### 5. Iniciar Backend

```bash
npm run dev
```

El servidor GraphQL estará disponible en:
- **GraphQL Playground**: http://localhost:4000/graphql
- **Health Check**: http://localhost:4000/health
- **WebSocket para Subscriptions**: ws://localhost:4000/graphql

### 6. Configurar Frontend

```bash
cd frontend
npm install
```

### 7. Iniciar Frontend

```bash
npm run dev
```

La aplicación frontend estará disponible en:
- **URL**: http://localhost:3000

## Verificación de Funcionalidad

### 1. Probar GraphQL Playground
- Abrir http://localhost:4000/graphql
- Ejecutar la siguiente query para verificar que los medicamentos se cargaron:

```graphql
query TestMedications {
  medications(filter: { limit: 5 }) {
    items {
      id
      commercialName
      price
      stock
    }
    totalCount
  }
}
```

### 2. Probar Frontend
- Abrir http://localhost:3000
- Navegar por el catálogo
- Ver detalles de medicamentos
- Probar búsqueda y filtros

### 3. Verificar DataLoader (N+1)
Revisar los logs del backend cuando cargues una página con múltiples medicamentos:
```
[DataLoader] batching 5 category ids
[DataLoader] batching 10 medication ids
```

### 4. Probar Subscriptions
Usar GraphQL Playground para suscribirse a cambios:
```graphql
subscription TestSubscription {
  orderStatusChanged(orderId: "uuid-de-ejemplo") {
    id
    status
  }
}
```

## Estructura del Proyecto

### Backend (`/backend`)
```
src/
├── commands/           # Modelo de escritura (CQRS)
│   ├── createOrder.command.ts
│   ├── submitPrescriptionEvidence.command.ts
│   ├── confirmOrder.command.ts
│   └── cancelOrder.command.ts
├── queries/            # Modelo de lectura (CQRS)
│   ├── getMedications.query.ts
│   └── getOrderProjection.query.ts
├── loaders/           # DataLoaders para N+1
│   └── categoryLoader.ts
├── resolvers/         # Resolvers GraphQL
│   ├── query.resolvers.ts
│   ├── mutation.resolvers.ts
│   └── subscription.resolvers.ts
├── schema/            # Schema GraphQL
│   └── schema.graphql
├── datasources/       # Cliente Supabase
│   └── supabaseClient.ts
├── types.ts           # Tipos TypeScript
├── context.ts         # Contexto de Apollo
└── server.ts          # Servidor principal
```

### Frontend (`/frontend`)
```
app/
├── layout.tsx         # Layout principal con ApolloProvider
├── page.tsx           # Página de inicio
├── catalog/           # Catálogo de medicamentos
│   └── page.tsx
├── medication/[id]/   # Detalles de medicamento
│   └── page.tsx
components/            # Componentes React
├── ApolloProviderWrapper.tsx
├── Header.tsx
├── Footer.tsx
└── MedicationCard.tsx
lib/
└── apolloClient.ts    # Configuración de Apollo Client
graphql/              # Queries, mutations, subscriptions
├── queries.ts
├── mutations.ts
└── subscriptions.ts
```

## Características Implementadas

### ✅ Backend GraphQL + CQRS
- Schema GraphQL completo con tipos fuertes
- Separación física de commands y queries (CQRS)
- DataLoader para mitigación N+1
- Subscriptions para tiempo real
- Manejo de errores ricos con union types
- Validaciones de negocio (stock, prescripción)

### ✅ Frontend React/Next.js
- Apollo Client configurado con split link (HTTP + WS)
- Catálogo con búsqueda y filtros
- Detalles de medicamento
- Diseño responsive con Tailwind CSS
- Componentes reutilizables

### ✅ Base de Datos
- DDL completo para Supabase (PostgreSQL)
- Dataset de 50 medicamentos reales
- Funciones almacenadas para atomicidad
- Índices para performance

### ✅ Documentación
- README.md con arquitectura y ejemplos
- INSTRUCCIONES.md con pasos de ejecución
- Ejemplos de queries GraphQL
- Diagramas de arquitectura

## Solución de Problemas

### Backend no inicia
- Verificar que las credenciales de Supabase sean correctas
- Verificar que el puerto 4000 esté disponible
- Revisar logs de error en la consola

### Frontend no se conecta al backend
- Verificar que el backend esté ejecutándose en http://localhost:4000
- Revisar la configuración en `frontend/lib/apolloClient.ts`
- Verificar CORS en el backend

### No se cargan medicamentos
- Ejecutar `npm run seed` en el backend
- Verificar conexión a Supabase
- Revisar logs del servidor

### Subscriptions no funcionan
- Verificar que el backend soporte WebSockets
- Probar en GraphQL Playground primero
- Revisar configuración de WebSocket en Apollo Client

## Recursos Adicionales

- [Documentación de Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- [Documentación de Apollo Client](https://www.apollographql.com/docs/react/)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)

## Licencia
MIT