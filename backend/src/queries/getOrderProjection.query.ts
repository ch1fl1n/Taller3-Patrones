import { supabase } from '../datasources/supabaseClient';
import { OrderStatus } from '../types';

export async function getOrderProjection(orderId: string) {
  try {
    // Obtener orden con información de evidencia de prescripción
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        prescription_evidences (*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        return null; // Orden no encontrada
      }
      console.error(`Error fetching order ${orderId}:`, orderError);
      throw new Error(`Failed to fetch order: ${orderError.message}`);
    }

    if (!order) {
      return null;
    }

    // Transformar datos de orden
    const transformedOrder = {
      id: order.id,
      patientId: order.patient_id,
      status: order.status as OrderStatus,
      total: order.total,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      prescriptionEvidence: order.prescription_evidences?.[0] ? {
        id: order.prescription_evidences[0].id,
        documentUrl: order.prescription_evidences[0].document_url,
        validationStatus: order.prescription_evidences[0].validation_status,
        validatedAt: order.prescription_evidences[0].validated_at,
        createdAt: order.prescription_evidences[0].created_at,
      } : undefined,
    };

    return transformedOrder;
  } catch (error) {
    console.error(`Error in getOrderProjection for order ${orderId}:`, error);
    throw error;
  }
}

// Función para obtener órdenes por paciente
export async function getOrdersByPatient(patientId: string) {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching orders for patient ${patientId}:`, error);
      throw new Error(`Failed to fetch patient orders: ${error.message}`);
    }

    return (orders || []).map(order => ({
      id: order.id,
      patientId: order.patient_id,
      status: order.status as OrderStatus,
      total: order.total,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    }));
  } catch (error) {
    console.error(`Error in getOrdersByPatient for patient ${patientId}:`, error);
    throw error;
  }
}

// Función para obtener estadísticas de órdenes (para dashboards)
export async function getOrderStatistics(patientId?: string) {
  try {
    let query = supabase
      .from('orders')
      .select('status', { count: 'exact' });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching order statistics:', error);
      throw new Error(`Failed to fetch order statistics: ${error.message}`);
    }

    // Contar por estado
    const statusCounts: Record<OrderStatus, number> = {
      PENDING_APPROVAL: 0,
      APPROVED: 0,
      DISPATCHED: 0,
      CANCELLED: 0,
    };

    data?.forEach(order => {
      const status = order.status as OrderStatus;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });

    return {
      total: count || 0,
      byStatus: statusCounts,
    };
  } catch (error) {
    console.error('Error in getOrderStatistics:', error);
    throw error;
  }
}