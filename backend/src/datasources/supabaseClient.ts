import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Crear cliente de Supabase con permisos de administrador para operaciones de backend
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
});

// Cliente para operaciones de usuario (si se necesita)
export const supabaseAnon = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || supabaseServiceKey
);

// Tipos para las tablas (se pueden generar automáticamente con Supabase CLI si se prefiere)
export type Category = {
  id: string;
  name: string;
  created_at: string;
};

export type Medication = {
  id: string;
  commercial_name: string;
  active_ingredient: string;
  category_id: string | null;
  laboratory: string;
  presentation: string;
  price: number;
  stock: number;
  requires_prescription: boolean;
  indications: string | null;
  contraindications: string | null;
  created_at: string;
};

export type Patient = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'CANCELLED';

export type Order = {
  id: string;
  patient_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type PrescriptionEvidence = {
  id: string;
  order_id: string;
  document_url: string | null;
  validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  validated_at: string | null;
  created_at: string;
};