import { ApolloContext, SubmitPrescriptionInput, SubmitPrescriptionResult } from '../types';
import { DEMO_PATIENT_ID } from '../context';
import { findOrderById, orderRequiresPrescription } from '../datasources/ordersRepository';
import { isValidDocumentUrl } from '../domain/prescription';
import { schedulePrescriptionReview } from '../domain/orderWorkflow';
import { publishOrderStatusUpdate } from '../resolvers/subscription.resolvers';
import {
  invalidOrderStatusError,
  orderNotFoundError,
  unauthorizedError,
  validationError,
} from './errors';

// Envía (o reenvía, tras un rechazo) la evidencia de fórmula de una orden pendiente.
// La evidencia inicial normalmente llega con createOrder; este comando cubre el reenvío.
export async function submitPrescriptionEvidence(
  input: SubmitPrescriptionInput,
  context: ApolloContext
): Promise<SubmitPrescriptionResult> {
  const { orderId } = input;
  const documentUrl = input.evidence?.documentUrl?.trim();

  // 1. Validación de entrada
  if (!isValidDocumentUrl(documentUrl)) {
    return validationError(
      'Prescription evidence must be an http(s) link to the document',
      'evidence.documentUrl'
    );
  }

  // 2. La orden existe, es del usuario y sigue pendiente de aprobación
  const order = await findOrderById(orderId);
  if (!order) {
    return orderNotFoundError(orderId);
  }

  const userId = context.user?.id || DEMO_PATIENT_ID;
  if (order.patientId !== userId) {
    return unauthorizedError('You are not authorized to submit prescription evidence for this order');
  }

  if (order.status !== 'PENDING_APPROVAL') {
    return invalidOrderStatusError(
      order.status,
      'APPROVED',
      `Order is ${order.status}; prescription evidence can only be submitted while PENDING_APPROVAL`
    );
  }

  if (!(await orderRequiresPrescription(orderId))) {
    return validationError('This order does not require prescription evidence', 'orderId', 'PRESCRIPTION_NOT_REQUIRED');
  }

  if (order.prescriptionEvidence?.validationStatus === 'VALIDATED') {
    return validationError('Prescription evidence was already validated', 'orderId', 'PRESCRIPTION_ALREADY_VALIDATED');
  }

  // 3. Registrar la evidencia (reemplaza la anterior) y dejarla pendiente de revisión
  const evidenceChanges = {
    document_url: documentUrl,
    validation_status: 'PENDING',
    validated_at: null,
  };

  const { data: evidence, error } = order.prescriptionEvidence
    ? await context.supabase
        .from('prescription_evidences')
        .update(evidenceChanges)
        .eq('id', order.prescriptionEvidence.id)
        .select('id')
        .single()
    : await context.supabase
        .from('prescription_evidences')
        .insert({ ...evidenceChanges, order_id: orderId })
        .select('id')
        .single();

  if (error || !evidence) {
    throw new Error(`Failed to save prescription evidence: ${error?.message}`);
  }

  // 4. Publicar el cambio y programar la revisión asíncrona
  const updatedOrder = await findOrderById(orderId);
  if (!updatedOrder) {
    throw new Error(`Order ${orderId} disappeared while saving prescription evidence`);
  }

  await publishOrderStatusUpdate(updatedOrder);
  schedulePrescriptionReview(orderId, evidence.id, documentUrl!);

  console.log(`✅ Prescription evidence submitted for order ${orderId}`);

  return {
    __typename: 'SubmitPrescriptionSuccess',
    order: updatedOrder,
  };
}
