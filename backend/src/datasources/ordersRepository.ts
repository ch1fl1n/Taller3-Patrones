import { supabase } from './supabaseClient';
import { Medication, Order, OrderStatus, Patient, PrescriptionEvidence } from '../types';

const ORDER_WITH_RELATIONS = `
  *,
  patients (*),
  order_items (*, medications (*)),
  prescription_evidences (*)
`;

export function mapMedicationRow(row: any): Medication {
  return {
    id: row.id,
    commercialName: row.commercial_name,
    activeIngredient: row.active_ingredient,
    categoryId: row.category_id,
    laboratory: row.laboratory,
    presentation: row.presentation,
    price: row.price,
    stock: row.stock,
    requiresPrescription: row.requires_prescription,
    indications: row.indications,
    contraindications: row.contraindications,
    createdAt: row.created_at,
  };
}

function mapPatientRow(row: any): Patient {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
  };
}

function mapEvidenceRow(row: any): PrescriptionEvidence {
  return {
    id: row.id,
    orderId: row.order_id,
    documentUrl: row.document_url,
    validationStatus: row.validation_status,
    validatedAt: row.validated_at,
    createdAt: row.created_at,
  };
}

function mapOrderRow(row: any): Order {
  // Si hay varias evidencias, la vigente es la más reciente
  const [latestEvidence] = [...(row.prescription_evidences || [])].sort((a: any, b: any) =>
    b.created_at.localeCompare(a.created_at)
  );

  return {
    id: row.id,
    patientId: row.patient_id,
    patient: row.patients ? mapPatientRow(row.patients) : undefined,
    status: row.status,
    total: row.total,
    items: (row.order_items || []).map((item: any) => ({
      id: item.id,
      medicationId: item.medication_id,
      medication: mapMedicationRow(item.medications),
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      createdAt: item.created_at,
    })),
    prescriptionEvidence: latestEvidence ? mapEvidenceRow(latestEvidence) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Orden completa (paciente, ítems con medicamento y evidencia) o null si no existe
export async function findOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_WITH_RELATIONS)
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch order ${orderId}: ${error.message}`);
  }

  return data ? mapOrderRow(data) : null;
}

// Transición condicional (compare-and-set): solo cambia si la orden sigue en `from`.
// Evita que un proceso asíncrono pise una cancelación hecha mientras tanto.
export async function transitionOrderStatus(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus
): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: to })
    .eq('id', orderId)
    .eq('status', from)
    .select('id');

  if (error) {
    throw new Error(`Failed to move order ${orderId} from ${from} to ${to}: ${error.message}`);
  }

  return (data || []).length > 0;
}

export async function orderRequiresPrescription(orderId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_prescription_required', {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(`Failed to check prescription requirement: ${error.message}`);
  }

  return Boolean(data);
}
