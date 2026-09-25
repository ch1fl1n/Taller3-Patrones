import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'afirmative-pill-secret-key-dev-only';
const JWT_EXPIRES_IN = '7d'; // Token válido por 7 días

// Tipos para payload JWT
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'patient' | 'admin' | 'pharmacist';
  patientId?: string; // ID del paciente en la base de datos
}

// Generar token JWT para un usuario
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'afirmative-pill-backend',
    audience: 'afirmative-pill-frontend',
  });
}

// Verificar y decodificar token JWT
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'afirmative-pill-backend',
      audience: 'afirmative-pill-frontend',
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}

// Extraer token del header Authorization
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remover "Bearer "
}

// Generar token para paciente de ejemplo (para desarrollo)
export function generateExamplePatientToken(): { token: string; user: JWTPayload } {
  const payload: JWTPayload = {
    userId: 'paciente-de-ejemplo-id',
    email: 'paciente@ejemplo.com',
    role: 'patient',
    patientId: 'paciente-de-ejemplo-id',
  };
  
  const token = generateToken(payload);
  
  return {
    token,
    user: payload,
  };
}

// Generar token para administrador (para desarrollo)
export function generateAdminToken(): { token: string; user: JWTPayload } {
  const payload: JWTPayload = {
    userId: 'admin-id',
    email: 'admin@afirmativepill.com',
    role: 'admin',
    patientId: undefined,
  };
  
  const token = generateToken(payload);
  
  return {
    token,
    user: payload,
  };
}

// Generar token para farmacéutico (para desarrollo)
export function generatePharmacistToken(): { token: string; user: JWTPayload } {
  const payload: JWTPayload = {
    userId: 'pharmacist-id',
    email: 'pharmacist@afirmativepill.com',
    role: 'pharmacist',
    patientId: undefined,
  };
  
  const token = generateToken(payload);
  
  return {
    token,
    user: payload,
  };
}

// Middleware para verificar autenticación
export function authenticateUser(authHeader?: string): JWTPayload | null {
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    // Para desarrollo, si no hay token, retornar usuario de ejemplo
    if (process.env.NODE_ENV === 'development') {
      console.warn('No authentication token provided, using example patient for development');
      return {
        userId: 'paciente-de-ejemplo-id',
        email: 'paciente@ejemplo.com',
        role: 'patient',
        patientId: 'paciente-de-ejemplo-id',
      };
    }
    
    return null;
  }
  
  return verifyToken(token);
}

// Función para crear usuario y generar token (simulación de registro/login)
export async function createUserAndGenerateToken(
  email: string,
  fullName: string,
  role: 'patient' | 'admin' | 'pharmacist' = 'patient'
) {
  // En producción, aquí crearíamos el usuario en la base de datos
  // Para el taller, simulamos la creación
  
  const userId = `user-${Date.now()}`;
  
  const payload: JWTPayload = {
    userId,
    email,
    role,
    patientId: role === 'patient' ? userId : undefined,
  };
  
  const token = generateToken(payload);
  
  return {
    token,
    user: payload,
  };
}

// Validar si un usuario tiene un rol específico
export function hasRole(user: JWTPayload | null, requiredRole: 'patient' | 'admin' | 'pharmacist'): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}

// Validar si un usuario tiene acceso a un recurso específico
export function canAccessResource(
  user: JWTPayload | null,
  resourceOwnerId?: string
): boolean {
  if (!user) return false;
  
  // Admin puede acceder a todo
  if (user.role === 'admin') return true;
  
  // Farmacéutico puede acceder a órdenes pero no a perfiles de pacientes
  if (user.role === 'pharmacist') {
    // Lógica específica para farmacéuticos
    return true; // Simplificado para el taller
  }
  
  // Paciente solo puede acceder a sus propios recursos
  if (user.role === 'patient') {
    return resourceOwnerId === user.userId || resourceOwnerId === user.patientId;
  }
  
  return false;
}