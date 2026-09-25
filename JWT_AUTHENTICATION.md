# Autenticación JWT - Afirmative Pill

## 📋 Resumen

Se ha implementado un sistema de autenticación JWT simple pero funcional para el proyecto Afirmative Pill. La autenticación no es foco principal de la rúbrica del taller, pero es necesaria para identificar pacientes y proteger recursos.

## 🎯 Características Implementadas

### 1. **Backend JWT**
- **Generación de tokens**: Tokens JWT firmados con secret key
- **Validación**: Middleware para verificar tokens en cada request
- **Payload**: Incluye userId, email, role y patientId
- **Roles**: `patient`, `admin`, `pharmacist`
- **Expiración**: Tokens válidos por 7 días

### 2. **Mutations GraphQL**
- **register**: Crear nueva cuenta de usuario
- **login**: Iniciar sesión con email

### 3. **Frontend Integration**
- **Almacenamiento**: Tokens guardados en localStorage
- **Headers**: Token incluido automáticamente en requests GraphQL
- **UI**: Componente de autenticación en header
- **Demo**: Cuenta de demostración pre-configurada

### 4. **Protección de Recursos**
- **Órdenes**: Solo pacientes pueden crear órdenes
- **Recursos**: Validación de ownership (paciente ve solo sus órdenes)
- **Admin**: Priviliegios especiales para confirmar órdenes

## 🔧 Configuración

### 1. **Secret Key JWT**
En el archivo `.env` del backend:
```env
JWT_SECRET=tu_secret_key_segura_aqui
```

**Para desarrollo**, puedes usar:
```env
JWT_SECRET=afirmative-pill-secret-key-dev-only
```

### 2. **Generar Tokens de Ejemplo**
El backend incluye funciones para generar tokens de ejemplo:
```typescript
// Token para paciente de ejemplo
const { token, user } = generateExamplePatientToken();

// Token para administrador
const { token, user } = generateAdminToken();
```

## 📝 Uso en GraphQL

### 1. **Registrar Usuario**
```graphql
mutation Register {
  register(input: {
    email: "usuario@ejemplo.com",
    fullName: "Juan Pérez",
    role: "patient"
  }) {
    __typename
    ... on AuthSuccess {
      token
      user {
        id
        email
        role
        patientId
      }
    }
    ... on AuthError {
      message
      code
    }
  }
}
```

### 2. **Iniciar Sesión**
```graphql
mutation Login {
  login(input: {
    email: "usuario@ejemplo.com"
  }) {
    __typename
    ... on AuthSuccess {
      token
      user {
        id
        email
        role
        patientId
      }
    }
    ... on AuthError {
      message
      code
    }
  }
}
```

### 3. **Usar Token en Requests**
Incluir el token en el header `Authorization`:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Flujo de Autenticación

### **Frontend (Usuario)**
1. Usuario hace click en "Iniciar sesión" o "Registrarse"
2. Se muestra modal con formulario
3. Al enviar, se llama a mutation `register` o `login`
4. Token recibido se guarda en `localStorage`
5. Token se incluye automáticamente en headers GraphQL
6. UI actualiza para mostrar estado autenticado

### **Backend (Validación)**
1. Cada request GraphQL pasa por `createContext`
2. Se extrae token del header `Authorization`
3. Se valida token con `jsonwebtoken.verify()`
4. Payload decodificado se agrega al contexto
5. Resolvers pueden acceder a `context.user`

### **Protección de Recursos**
```typescript
// En commands/resolvers:
if (!context.user || context.user.role !== 'patient') {
  throw new Error('Authentication required');
}
```

## 🔐 Tokens de Ejemplo para Desarrollo

### **Paciente Demo**
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJwYWNpZW50ZS1kZS1lamVtcGxvLWlkIiwiZW1haWwiOiJwYWNpZW50ZUBlamVtcGxvLmNvbSIsInJvbGUiOiJwYXRpZW50IiwicGF0aWVudElkIjoicGFjaWVudGUtZGUtZWplbXBsby1pZCIsImlhdCI6MTY5OTk5OTk5OSwiZXhwIjoxNzAwNjA0Nzk5LCJpc3MiOiJhZmlybWF0aXZlLXBpbGwtYmFja2VuZCIsImF1ZCI6ImFmaXJtYXRpdmUtcGlsbC1mcm9udGVuZCJ9.example-signature

Payload:
{
  "userId": "paciente-de-ejemplo-id",
  "email": "paciente@ejemplo.com",
  "role": "patient",
  "patientId": "paciente-de-ejemplo-id"
}
```

### **Administrador Demo**
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi1pZCIsImVtYWlsIjoiYWRtaW5AYWZpcm1hdGl2ZXBpbGwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjk5OTk5OTk5LCJleHAiOjE3MDA2MDQ3OTksImlzcyI6ImFmaXJtYXRpdmUtcGlsbC1iYWNrZW5kIiwiYXVkIjoiYWZpcm1hdGl2ZS1waWxsLWZyb250ZW5kIn0.example-signature

Payload:
{
  "userId": "admin-id",
  "email": "admin@afirmativepill.com",
  "role": "admin"
}
```

## 🧪 Testing de Autenticación

### **1. Probar con curl**
```bash
# Registrar usuario
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { register(input: {email:\"test@example.com\", fullName:\"Test User\"}) { __typename ... on AuthSuccess { token } } }"}'

# Crear orden con token
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -d '{"query":"mutation { createOrder(input: {items: [{medicationId:\"UUID\", quantity:1}]}) { __typename } }"}'
```

### **2. Probar en GraphQL Playground**
1. Abrir http://localhost:4000/graphql
2. En panel "HTTP Headers" agregar:
```json
{
  "Authorization": "Bearer TOKEN_AQUI"
}
```

### **3. Probar Frontend**
1. Abrir http://localhost:3000
2. Click en "Iniciar sesión" o "Usar demo"
3. Verificar que header muestra estado autenticado
4. Intentar crear orden (debe funcionar)

## ⚠️ Consideraciones de Seguridad

### **Para Producción**
1. **Cambiar JWT_SECRET**: Usar secret key fuerte y segura
2. **HTTPS**: Siempre usar HTTPS en producción
3. **Token Storage**: Considerar HttpOnly cookies para mayor seguridad
4. **Refresh Tokens**: Implementar refresh tokens para renovación
5. **Rate Limiting**: Limitar intentos de login/registro

### **Para el Taller (Desarrollo)**
1. **Tokens de ejemplo**: Pre-configurados para facilitar testing
2. **Auto-login**: En desarrollo, si no hay token se usa usuario demo
3. **Validación simple**: Sin verificación de email/contraseña compleja

## 🔄 Actualización del Cliente Apollo

El frontend maneja tokens dinámicamente:
```typescript
// Guardar token
localStorage.setItem('auth_token', token);

// Incluir en headers
headers: token ? { Authorization: `Bearer ${token}` } : {}

// Limpiar token (logout)
localStorage.removeItem('auth_token');
```

## 📊 Integración con CQRS

La autenticación JWT se integra con la arquitectura CQRS:

### **Commands**
- **createOrder**: Verifica que user.role === 'patient'
- **cancelOrder**: Verifica ownership (order.patient_id === user.patientId)
- **confirmOrder**: Verifica que user.role === 'admin'

### **Queries**
- **myOrders**: Filtra órdenes por patientId del usuario
- **me**: Retorna información del usuario actual

## 🎥 Para el Video de Sustentación

**Demostrar:**
1. **Registro/Llogin**: Mostrar formulario funcionando
2. **Token en localStorage**: Mostrar token guardado
3. **Headers en Network Tab**: Mostrar Authorization header
4. **Acceso Protegido**: Intentar crear orden sin autenticación (debe fallar)
5. **Roles**: Mostrar diferencia entre paciente y admin

**Comandos útiles:**
```bash
# Generar token de ejemplo desde backend
node -e "const { generateExamplePatientToken } = require('./dist/auth/jwt'); console.log(generateExamplePatientToken());"
```

## 🏁 Conclusión

El sistema JWT implementado provee:
- ✅ **Autenticación básica** funcional
- ✅ **Integración con GraphQL** completa
- ✅ **Protección de recursos** según roles
- ✅ **UI de autenticación** en frontend
- ✅ **Tokens de ejemplo** para desarrollo

**Estado**: ✅ IMPLEMENTADO Y FUNCIONAL
**Listo para demostración**: ✅ SÍ