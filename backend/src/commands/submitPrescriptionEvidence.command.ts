import { ApolloContext, SubmitPrescriptionInput, SubmitPrescriptionResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { publishOrderStatusUpdate } from '../resolvers/subscription.resolvers';

export async function submitPrescriptionEvidence(
  input: SubmitPrescriptionInput,
  context: ApolloContext
): Promise<SubmitPrescriptionResult> {
  const { orderId, evidence } = input;
  const { documentUrl } = evidence;
  
  try {
    // Validaciones básicas
    if (!documentUrl || documentUrl.trim() === '') {
      return {
        __typename: 'ValidationError',
        message: 'Document URL is required',
        code: 'VALIDATION_ERROR',
        field: 'documentUrl',
      };
    }

    // 1. Verificar que la orden existe
    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        __typename: 'OrderNotFoundError',
        message: `Order ${orderId} not found`,
        code: 'ORDER_NOT_FOUND',
        orderId,
      };
    }

    // 2. Verificar que la orden está en estado PENDING_APPROVAL
    if (order.status !== 'PENDING_APPROVAL') {
      return {
        __typename: 'ValidationError',
        message: `Order is in ${order.status} status, cannot submit prescription evidence`,
        code: 'INVALID_ORDER_STATUS',
        field: 'orderId',
      };
    }

    // 3. Verificar permisos (solo el dueño de la orden puede enviar evidencia)
    const userId = context.user?.id || 'paciente-de-ejemplo-id';
    if (order.patient_id !== userId) {
      return {
        __typename: 'ValidationError',
        message: 'You are not authorized to submit prescription evidence for this order',
        code: 'UNAUTHORIZED',
        field: 'orderId',
      };
    }

    // 4. Verificar si la orden requiere prescripción
    const { data: orderItems, error: itemsError } = await context.supabase
      .from('order_items')
      .select(`
        *,
        medications (*)
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      throw new Error('Failed to validate prescription requirements');
    }

    const requiresPrescription = orderItems?.some(
      (item: any) => item.medications.requires_prescription
    );

    if (!requiresPrescription) {
      return {
        __typename: 'ValidationError',
        message: 'This order does not require prescription evidence',
        code: 'PRESCRIPTION_NOT_REQUIRED',
        field: 'orderId',
      };
    }

    // 5. Crear o actualizar evidencia de prescripción
    const evidenceId = uuidv4();
    
    const { data: existingEvidence, error: checkError } = await context.supabase
      .from('prescription_evidences')
      .select('*')
      .eq('order_id', orderId)
      .single();

    let evidenceData;
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing evidence:', checkError);
      throw new Error('Failed to check prescription evidence');
    }

    if (existingEvidence) {
      // Actualizar evidencia existente
      const { data: updatedEvidence, error: updateError } = await context.supabase
        .from('prescription_evidences')
        .update({
          document_url: documentUrl,
          validation_status: 'PENDING',
          validated_at: null,
        })
        .eq('id', existingEvidence.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating prescription evidence:', updateError);
        throw new Error('Failed to update prescription evidence');
      }

      evidenceData = updatedEvidence;
    } else {
      // Crear nueva evidencia
      const { data: newEvidence, error: createError } = await context.supabase
        .from('prescription_evidences')
        .insert({
          id: evidenceId,
          order_id: orderId,
          document_url: documentUrl,
          validation_status: 'PENDING',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating prescription evidence:', createError);
        throw new Error('Failed to create prescription evidence');
      }

      evidenceData = newEvidence;
    }

    // 6. Simular validación asíncrona (para el taller)
    // En producción, esto podría integrarse con un servicio externo
    setTimeout(async () => {
      try {
        const isValid = Math.random() > 0.3; // 70% de probabilidad de validación exitosa
        
        const { error: validationError } = await context.supabase
          .from('prescription_evidences')
          .update({
            validation_status: isValid ? 'VALIDATED' : 'REJECTED',
            validated_at: new Date().toISOString(),
          })
          .eq('id', evidenceData.id);

        if (validationError) {
          console.error('Error updating validation status:', validationError);
          return;
        }

        // Si es válida, actualizar estado de la orden
        if (isValid) {
          const { error: orderUpdateError } = await context.supabase
            .from('orders')
            .update({ status: 'APPROVED' })
            .eq('id', orderId);

          if (orderUpdateError) {
            console.error('Error updating order status after validation:', orderUpdateError);
            return;
          }

          // Obtener orden actualizada
          const { data: updatedOrder, error: fetchError } = await context.supabase
            .from('orders')
            .select(`
              *,
              order_items (
                *,
                medications (*)
              ),
              prescription_evidences (*)
            `)
            .eq('id', orderId)
            .single();

          if (!fetchError && updatedOrder) {
            const transformedOrder = transformOrder(updatedOrder);
            await publishOrderStatusUpdate(orderId, transformedOrder, context);
          }
        }

        console.log(`✅ Prescription validation completed for order ${orderId}: ${isValid ? 'VALIDATED' : 'REJECTED'}`);
      } catch (error) {
        console.error('Error in async prescription validation:', error);
      }
    }, 5000); // 5 segundos de delay para simular procesamiento

    // 7. Obtener orden actualizada
    const { data: updatedOrder, error: fetchError } = await context.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          medications (*)
        ),
        prescription_evidences (*)
      `)
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated order:', fetchError);
      throw new Error('Failed to fetch updated order');
    }

    // 8. Transformar respuesta
    const transformedOrder = transformOrder(updatedOrder);

    console.log(`✅ Prescription evidence submitted for order ${orderId}`);
    
    return {
      __typename: 'SubmitPrescriptionSuccess',
      order: transformedOrder,
    };

  } catch (error) {
    console.error('Unexpected error in submitPrescriptionEvidence command:', error);
    
    return {
      __typename: 'ValidationError',
      message: 'An unexpected error occurred while submitting prescription evidence',
      code: 'INTERNAL_ERROR',
    };
  }
}

// Función auxiliar para transformar orden
function transformOrder(order: any) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: order.order_items.map((item: any) => ({
      id: item.id,
      medication: {
        id: item.medications.id,
        commercialName: item.medications.commercial_name,
        activeIngredient: item.medications.active_ingredient,
        laboratory: item.medications.laboratory,
        presentation: item.medications.presentation,
        price: item.medications.price,
        stock: item.medications.stock,
        requiresPrescription: item.medications.requires_prescription,
        indications: item.medications.indications,
        contraindications: item.medications.contraindications,
        createdAt: item.medications.created_at,
      },
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.quantity * item.unit_price,
      createdAt: item.created_at,
    })),
    prescriptionEvidence: order.prescription_evidences?.[0] ? {
      id: order.prescription_evidences[0].id,
      documentUrl: order.prescription_evidences[0].document_url,
      validationStatus: order.prescription_evidences[0].validation_status,
      validatedAt: order.prescription_evidences[0].validated_at,
      createdAt: order.prescription_evidences[0].created_at,
    } : null,
  };
}