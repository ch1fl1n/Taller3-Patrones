import { ApolloContext } from '../types';
import { createUserAndGenerateToken, generateExamplePatientToken, generateAdminToken } from '../auth/jwt';
import { supabase } from '../datasources/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface RegisterInput {
  email: string;
  fullName: string;
  role?: 'patient' | 'admin' | 'pharmacist';
}

export interface LoginInput {
  email: string;
}

export type AuthResult = {
  __typename: 'AuthSuccess';
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    patientId?: string;
  };
} | {
  __typename: 'AuthError';
  message: string;
  code: string;
};

export async function register(
  input: RegisterInput,
  context: ApolloContext
): Promise<AuthResult> {
  const { email, fullName, role = 'patient' } = input;
  
  try {
    // Validaciones
    if (!email || !email.includes('@')) {
      return {
        __typename: 'AuthError',
        message: 'Invalid email address',
        code: 'INVALID_EMAIL',
      };
    }

    if (!fullName || fullName.trim().length < 2) {
      return {
        __typename: 'AuthError',
        message: 'Full name must be at least 2 characters',
        code: 'INVALID_NAME',
      };
    }

    // Verificar si el usuario ya existe
    const { data: existingPatient, error: checkError } = await supabase
      .from('patients')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return {
        __typename: 'AuthError',
        message: 'Error checking user existence',
        code: 'DATABASE_ERROR',
      };
    }

    let patientId: string;
    
    if (existingPatient) {
      // Usuario ya existe, usar su ID
      patientId = existingPatient.id;
    } else {
      // Crear nuevo paciente en la base de datos
      patientId = uuidv4();
      
      const { error: createError } = await supabase
        .from('patients')
        .insert({
          id: patientId,
          full_name: fullName,
          email: email,
        });

      if (createError) {
        console.error('Error creating patient:', createError);
        return {
          __typename: 'AuthError',
          message: 'Failed to create user account',
          code: 'DATABASE_ERROR',
        };
      }
    }

    // Generar token JWT
    const { token, user } = await createUserAndGenerateToken(email, fullName, role);
    
    // Actualizar patientId en el payload del usuario
    const userWithPatientId = {
      ...user,
      patientId: role === 'patient' ? patientId : undefined,
    };

    console.log(`✅ User registered: ${email} (${role})`);
    
    return {
      __typename: 'AuthSuccess',
      token,
      user: {
        id: userWithPatientId.userId,
        email: userWithPatientId.email,
        role: userWithPatientId.role,
        patientId: userWithPatientId.patientId,
      },
    };

  } catch (error) {
    console.error('Unexpected error in register command:', error);
    
    return {
      __typename: 'AuthError',
      message: 'An unexpected error occurred during registration',
      code: 'INTERNAL_ERROR',
    };
  }
}

export async function login(
  input: LoginInput,
  context: ApolloContext
): Promise<AuthResult> {
  const { email } = input;
  
  try {
    // Validaciones
    if (!email || !email.includes('@')) {
      return {
        __typename: 'AuthError',
        message: 'Invalid email address',
        code: 'INVALID_EMAIL',
      };
    }

    // Buscar usuario en la base de datos
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, full_name, email')
      .eq('email', email)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        // Usuario no encontrado
        return {
          __typename: 'AuthError',
          message: 'User not found. Please register first.',
          code: 'USER_NOT_FOUND',
        };
      }
      
      console.error('Error finding user:', patientError);
      return {
        __typename: 'AuthError',
        message: 'Error finding user account',
        code: 'DATABASE_ERROR',
      };
    }

    // Determinar rol (para el taller, todos son pacientes)
    const role: 'patient' | 'admin' | 'pharmacist' = 'patient';
    
    // Generar token JWT
    const { token, user } = await createUserAndGenerateToken(
      patient.email,
      patient.full_name,
      role
    );

    // Actualizar patientId
    const userWithPatientId = {
      ...user,
      patientId: patient.id,
    };

    console.log(`✅ User logged in: ${email}`);
    
    return {
      __typename: 'AuthSuccess',
      token,
      user: {
        id: userWithPatientId.userId,
        email: userWithPatientId.email,
        role: userWithPatientId.role,
        patientId: userWithPatientId.patientId,
      },
    };

  } catch (error) {
    console.error('Unexpected error in login command:', error);
    
    return {
      __typename: 'AuthError',
      message: 'An unexpected error occurred during login',
      code: 'INTERNAL_ERROR',
    };
  }
}

// Función para obtener tokens de ejemplo (para desarrollo/pruebas)
export function getExampleTokens() {
  return {
    patient: generateExamplePatientToken(),
    admin: generateAdminToken(),
  };
}

// Función para validar token existente
export function validateToken(token: string): AuthResult {
  try {
    const { token: validToken, user } = generateExamplePatientToken();
    
    // En producción, aquí verificaríamos el token real
    // Para el taller, simulamos validación
    
    return {
      __typename: 'AuthSuccess',
      token: validToken,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
      },
    };
  } catch (error) {
    return {
      __typename: 'AuthError',
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    };
  }
}