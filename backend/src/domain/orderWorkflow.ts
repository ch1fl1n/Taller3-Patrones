import { supabase } from '../datasources/supabaseClient';
import { findOrderById, transitionOrderStatus } from '../datasources/ordersRepository';
import { publishOrderStatusUpdate } from '../resolvers/subscription.resolvers';
import { OrderStatus } from '../types';
import { simulatePharmacistReview } from './prescription';

// Procesamiento asíncrono de la orden (consistencia eventual, sección 8 del planning.md).
// La mutation responde de inmediato con PENDING_APPROVAL; estos pasos ocurren después
// y cada cambio de estado se publica a la subscription orderStatusChanged.
// Es una simulación en memoria: no se exige una cola real para el taller.
export const WORKFLOW_DELAYS_MS = {
  approval: 5000,
  prescriptionReview: 5000,
  dispatch: 8000,
};

function runLater(label: string, delayMs: number, task: () => Promise<unknown>) {
  setTimeout(() => {
    task().catch((error) => console.error(`[OrderWorkflow] ${label} failed:`, error));
  }, delayMs);
}

async function moveAndPublish(orderId: string, from: OrderStatus, to: OrderStatus): Promise<boolean> {
  const moved = await transitionOrderStatus(orderId, from, to);

  if (!moved) {
    console.log(`[OrderWorkflow] Order ${orderId} is no longer ${from}; skipping ${to}`);
    return false;
  }

  console.log(`[OrderWorkflow] Order ${orderId}: ${from} → ${to}`);
  const order = await findOrderById(orderId);
  if (order) {
    await publishOrderStatusUpdate(order);
  }
  return true;
}

// Orden sin medicamentos formulados: se aprueba automáticamente y luego se despacha
export function scheduleApproval(orderId: string) {
  runLater('approval', WORKFLOW_DELAYS_MS.approval, async () => {
    if (await moveAndPublish(orderId, 'PENDING_APPROVAL', 'APPROVED')) {
      scheduleDispatch(orderId);
    }
  });
}

export function scheduleDispatch(orderId: string) {
  runLater('dispatch', WORKFLOW_DELAYS_MS.dispatch, () =>
    moveAndPublish(orderId, 'APPROVED', 'DISPATCHED')
  );
}

// Orden con medicamentos formulados: se revisa la evidencia; si se valida, la orden se aprueba.
// Si se rechaza, la orden sigue en PENDING_APPROVAL hasta que el paciente reenvíe la evidencia.
export function schedulePrescriptionReview(orderId: string, evidenceId: string, documentUrl: string) {
  runLater('prescription review', WORKFLOW_DELAYS_MS.prescriptionReview, async () => {
    const result = simulatePharmacistReview(documentUrl);

    // Solo se resuelve si la evidencia sigue pendiente y no fue reemplazada por un reenvío
    const { data, error } = await supabase
      .from('prescription_evidences')
      .update({ validation_status: result, validated_at: new Date().toISOString() })
      .eq('id', evidenceId)
      .eq('validation_status', 'PENDING')
      .eq('document_url', documentUrl)
      .select('id');

    if (error) {
      throw new Error(`Failed to update prescription evidence: ${error.message}`);
    }
    if (!data || data.length === 0) {
      console.log(`[OrderWorkflow] Evidence ${evidenceId} was replaced or already reviewed; skipping`);
      return;
    }

    console.log(`[OrderWorkflow] Prescription for order ${orderId}: ${result}`);

    if (result === 'VALIDATED') {
      if (await moveAndPublish(orderId, 'PENDING_APPROVAL', 'APPROVED')) {
        scheduleDispatch(orderId);
      }
      return;
    }

    // Rechazada: el estado de la orden no cambia, pero el cliente debe enterarse
    const order = await findOrderById(orderId);
    if (order) {
      await publishOrderStatusUpdate(order);
    }
  });
}
