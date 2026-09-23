# Afirmative Pill - E-Commerce Farmacéutico

## Descripción
Plataforma e-commerce farmacéutica implementada con arquitectura GraphQL + CQRS para el Taller 3 de Patrones de Arquitectura.

## Arquitectura

### Componentes Principales
- **Backend**: Apollo Server (Node.js/TypeScript) con arquitectura CQRS
- **Frontend**: React + Next.js + Apollo Client
- **Base de Datos**: Supabase (PostgreSQL)
- **Comunicación**: GraphQL puro (cero REST)

### Diagrama de Arquitectura
```
┌─────────────────┐     GraphQL     ┌─────────────────┐
│   Frontend      │◄───────────────►│    Backend      │
│   React/Next.js │   (HTTP/WS)     │ Apollo Server   │
│   Apollo Client │                 │   TypeScript    │
└─────────────────┘                 └────────┬────────┘
                                             │
                                             │ DataLoader
                                             │ Resolvers
                                             ▼
                                     ┌─────────────────┐
                                     │   Supabase      │
                                     │   PostgreSQL    │
                                     └─────────────────┘
```

## Estructura del Proyecto

```
Taller3-Patrones/
├── backend/          # Servidor GraphQL + CQRS
│   ├── src/
│   │   ├── commands/    # Modelo de escritura (CQRS)
│   │   ├── queries/     # Modelo de lectura (CQRS)
│   │   ├── datasources/ # Cliente Supabase
│   │   ├── loaders/     # DataLoaders para N+1
│   │   └── resolvers/   # Resolvers GraphQL
│   ├── scripts/      # Scripts de seed
│   └── package.json
├── frontend/         # Aplicación React/Next.js
├── scripts/          # Scripts compartidos
│   ├── supabase_ddl.sql    # DDL de la base de datos
│   └── medications_dataset.csv # Dataset de 50 medicamentos
└── planning.md       # Documento de planificación técnica
```

## Requisitos Previos

- Node.js 18+ 
- Cuenta de [Supabase](https://supabase.com/)
- Git

## Configuración Inicial

### 1. Configurar Supabase
1. Crear un proyecto en [Supabase](https://supabase.com/)
2. Ejecutar el DDL desde `scripts/supabase_ddl.sql`
3. Obtener las credenciales:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Configurar Backend
```bash
cd backend
cp .env.example .env
# Editar .env con las credenciales de Supabase
npm install
```

### 3. Cargar Datos
```bash
npm run seed
```
Este comando cargará el dataset de 50 medicamentos en la base de datos.

### 4. Iniciar Backend
```bash
npm run dev
```
El servidor GraphQL estará disponible en `http://localhost:4000/graphql`

## Características Implementadas

### GraphQL Schema
- **Types**: Medication, Category, Order, OrderItem, Patient
- **Queries**: Catálogo con filtros, ficha detallada, órdenes
- **Mutations**: Crear orden, validar prescripción, confirmar/cancelar
- **Subscriptions**: Seguimiento en tiempo real de estado de orden

### CQRS (Command Query Responsibility Segregation)
- Separación física de comandos (escritura) y queries (lectura)
- Invariantes de negocio protegidas en comandos
- Proyecciones optimizadas para lectura

### Mitigación N+1
- DataLoader por request
- Agrupación de consultas por lote
- Logs de evidencia de batching

### Consistencia Eventual
- Estados de orden: PENDING_APPROVAL → APPROVED → DISPATCHED
- Actualizaciones en tiempo real vía subscriptions
- Validación asíncrona de prescripciones médicas

## Dataset de Medicamentos

El proyecto incluye un dataset de 50 medicamentos reales con:
- Nombre comercial y principio activo
- Categoría terapéutica
- Laboratorio y presentación
- Precio y stock
- Requisito de prescripción médica
- Indicaciones y contraindicaciones

## Desarrollo

### Backend
```bash
cd backend
npm run dev      # Desarrollo
npm run build    # Compilar TypeScript
npm start        # Producción
npm test         # Tests
```

### Frontend (Próximamente)
```bash
cd frontend
npm run dev
```

## Verificación de Criterios

### ✅ Diseño GraphQL (40%)
- Schema SDL con tipos fuertes
- Queries/Mutations/Subscriptions
- DataLoader documentado con logs
- Payloads tipados con union/interface

### ✅ CQRS y Dominio (25%)
- Separación física commands/queries
- Máquina de estados de orden
- Invariantes explícitas
- Estrategia de consistencia eventual

### ⏳ Frontend Apollo (20%)
- ApolloProvider configurado
- Hooks useQuery/useMutation/useSubscription
- Actualización de caché tras mutaciones

### ✅ Persistencia y Docs (15%)
- DDL Supabase completo
- Script de seed de 50 registros
- README con diagrama y justificaciones

## Licencia
MIT


## Pruebas del Backend

### Instalar y Configurar
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con credenciales de Supabase
```

### Cargar Datos de Prueba
```bash
npm run seed
```

### Iniciar Servidor de Desarrollo
```bash
npm run dev
```

### Ejemplos de Queries GraphQL

#### 1. Consultar Catálogo de Medicamentos
```graphql
query GetMedications {
  medications(filter: { limit: 10 }) {
    items {
      id
      commercialName
      activeIngredient
      price
      presentation
      requiresPrescription
      inStock
      category {
        id
        name
      }
    }
    totalCount
    pageInfo {
      hasNextPage
      currentPage
      totalPages
    }
  }
}
```

#### 2. Crear una Orden
```graphql
mutation CreateOrder {
  createOrder(input: {
    items: [
      { medicationId: "uuid-del-medicamento", quantity: 2 }
    ]
  }) {
    __typename
    ... on CreateOrderSuccess {
      order {
        id
        status
        total
        items {
          medication {
            commercialName
            price
          }
          quantity
          unitPrice
          subtotal
        }
      }
    }
    ... on InsufficientStockError {
      message
      medicationName
      availableStock
      requestedQuantity
    }
    ... on PrescriptionRequiredError {
      message
      medicationNames
    }
  }
}
```

#### 3. Suscribirse a Cambios de Estado
```graphql
subscription OrderStatusChanged {
  orderStatusChanged(orderId: "uuid-de-la-orden") {
    id
    status
    updatedAt
  }
}
```

## Verificación de N+1 con DataLoader

El backend incluye DataLoaders que agrupan consultas para evitar problemas N+1. Puedes verificar esto en los logs del servidor:

```
[DataLoader] batching 5 category ids
[DataLoader] batching 3 medication ids
[DataLoader] batching 2 patient ids
```

## Estructura CQRS Implementada

### Commands (Escritura)
- `createOrder.command.ts` - Crear nueva orden con validaciones
- `submitPrescriptionEvidence.command.ts` - Enviar evidencia médica
- `confirmOrder.command.ts` - Confirmar orden (admin)
- `cancelOrder.command.ts` - Cancelar orden con restauración de stock

### Queries (Lectura)
- `getMedications.query.ts` - Catálogo con filtros y paginación
- `getOrderProjection.query.ts` - Proyecciones optimizadas de órdenes

### DataLoaders
- `categoryLoader` - Carga batch de categorías
- `medicationLoader` - Carga batch de medicamentos
- `patientLoader` - Carga batch de pacientes
- `orderItemLoader` - Carga batch de items de orden