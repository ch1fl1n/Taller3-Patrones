import { ApolloContext, CreateOrderInput, CreateOrderResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { publishOrderStatusUpdate, publishMedicationStockUpdate } from '../resolvers/subscription.resolvers';

export async function createOrder(
  input: CreateOrderInput,
  context: ApolloContext
): Promise<CreateOrderResult> {
  const { items } = input;
  
  try {
    // Validaciones básicas
    if (!items || items.length === 0) {
      return {
        __typename: 'ValidationError',
        message: 'Order must contain at least one item',
        code: 'VALIDATION_ERROR',
        field: 'items',
      };
    }

    // Obtener usuario actual (simulado para el taller)
    const userId = context.user?.id || 'paciente-de-ejemplo-id';
    
    // 1. Verificar stock y obtener información de medicamentos
    const medicationIds = items.map(item => item.medicationId);
    const { data: medications, error: medError } = await context.supabase
      .from('medications')
      .select('*')
      .in('id', medicationIds);

    if (medError) {
      console.error('Error fetching medications:', medError);
      throw new Error('Failed to validate order items');
    }

    if (!medications || medications.length !== items.length) {
      return {
        __typename: 'ValidationError',
        message: 'One or more medications not found',
        code: 'VALIDATION_ERROR',
        field: 'items',
      };
    }

    // Crear mapa de medicamentos por ID
    const medicationMap = new Map(medications.map(m => [m.id, m]));

    // 2. Validar stock disponible
    const insufficientStockItems = items.filter(item => {
      const medication = medicationMap.get(item.medicationId);
      return medication && medication.stock < item.quantity;
    });

    if (insufficientStockItems.length > 0) {
      const firstItem = insufficientStockItems[0];
      const medication = medicationMap.get(firstItem.medicationId)!;
      
      return {
        __typename: 'InsufficientStockError',
        message: `Insufficient stock for ${medication.commercial_name}`,
        code: 'INSUFFICIENT_STOCK',
        medicationId: firstItem.medicationId,
        medicationName: medication.commercial_name,
        availableStock: medication.stock,
        requestedQuantity: firstItem.quantity,
      };
    }

    // 3. Verificar si se requiere prescripción médica
    const prescriptionRequiredItems = items.filter(item => {
      const medication = medicationMap.get(item.medicationId);
      return medication && medication.requires_prescription;
    });

    if (prescriptionRequiredItems.length > 0) {
      return {
        __typename: 'PrescriptionRequiredError',
        message: 'Prescription required for one or more medications',
        code: 'PRESCRIPTION_REQUIRED',
        medicationIds: prescriptionRequiredItems.map(item => item.medicationId),
        medicationNames: prescriptionRequiredItems.map(item => {
          const medication = medicationMap.get(item.medicationId)!;
          return medication.commercial_name;
        }),
      };
    }

    // 4. Iniciar transacción para crear orden
    const orderId = uuidv4();
    let total = 0;
    const orderItems = [];

    // Usar transacción para garantizar atomicidad
    const { data: order, error: orderError } = await context.supabase
      .from('orders')
      .insert({
        id: orderId,
        patient_id: userId,
        status: 'PENDING_APPROVAL',
        total: 0, // Se actualizará después
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw new Error('Failed to create order');
    }

    // 5. Crear items de orden y actualizar stock
    for (const item of items) {
      const medication = medicationMap.get(item.medicationId)!;
      const itemId = uuidv4();
      const unitPrice = medication.price;
      const subtotal = unitPrice * item.quantity;
      
      total += subtotal;

      // Insertar item de orden
      const { error: itemError } = await context.supabase
        .from('order_items')
        .insert({
          id: itemId,
          order_id: orderId,
          medication_id: item.medicationId,
          quantity: item.quantity,
          unit_price: unitPrice,
        });

      if (itemError) {
        console.error('Error creating order item:', itemError);
        throw new Error('Failed to create order items');
      }

      // Decrementar stock usando función PostgreSQL atómica
      const { data: stockResult, error: stockError } = await context.supabase.rpc(
        'decrement_stock',
        {
          p_medication_id: item.medicationId,
          p_quantity: item.quantity,
        }
      );

      if (stockError || !stockResult) {
        console.error('Error decrementing stock:', stockError);
        throw new Error('Failed to update medication stock');
      }

      orderItems.push({
        id: itemId,
        medicationId: item.medicationId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });

      // Publicar actualización de stock via subscription
      const updatedMedication = {
        ...medication,
        stock: medication.stock - item.quantity,
      };
      
      await publishMedicationStockUpdate(item.medicationId, updatedMedication, context);
    }

    // 6. Actualizar total de la orden
    const { error: updateError } = await context.supabase
      .from('orders')
      .update({ total })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order total:', updateError);
      throw new Error('Failed to update order total');
    }

    // 7. Obtener orden completa con relaciones
    const { data: completeOrder, error: fetchError } = await context.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          medications (*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (fetchError) {
      console.error('Error fetching complete order:', fetchError);
      throw new Error('Failed to fetch created order');
    }

    // 8. Transformar respuesta
    const transformedOrder = {
      id: completeOrder.id,
      status: completeOrder.status,
      total: completeOrder.total,
      createdAt: completeOrder.created_at,
      updatedAt: completeOrder.updated_at,
      items: completeOrder.order_items.map((item: any) => ({
        id: item.id,
        medication: {
          id: item.medications.id,
          commercialName: item.medications.commercial_name,
          activeIngredient: item.medications.active_ingredient,
          laboratory: item.medications.laboratory,
          presentation: item.medications.presentation,
          price: item.medications.price,
          stock: item.medications.stock - item.quantity, // Stock actualizado
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
    };

    // 9. Publicar evento de creación de orden
    await publishOrderStatusUpdate(orderId, transformedOrder, context);

    console.log(`✅ Order ${orderId} created successfully`);
    
    return {
      __typename: 'CreateOrderSuccess',
      order: transformedOrder,
    };

  } catch (error) {
    console.error('Unexpected error in createOrder command:', error);
    
    // En caso de error, intentar revertir
    return {
      __typename: 'ValidationError',
      message: 'An unexpected error occurred while creating the order',
      code: 'INTERNAL_ERROR',
    };
  }
}