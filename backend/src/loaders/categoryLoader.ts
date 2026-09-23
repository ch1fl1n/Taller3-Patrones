import DataLoader from 'dataloader';
import { supabase } from '../datasources/supabaseClient';

// DataLoader para categorías
export const createCategoryLoader = () => {
  return new DataLoader(async (ids: readonly string[]) => {
    console.log(`[DataLoader] batching ${ids.length} category ids`);
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .in('id', ids as string[]);

      if (error) {
        console.error('Error loading categories:', error);
        throw error;
      }

      // Crear mapa de categorías por ID
      const categoryMap = new Map<string, any>();
      data?.forEach(category => {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          createdAt: category.created_at,
        });
      });

      // Retornar en el mismo orden que los IDs solicitados
      return ids.map(id => categoryMap.get(id) || null);
    } catch (error) {
      console.error('Error in category DataLoader:', error);
      throw error;
    }
  }, {
    // Configuración del DataLoader
    cache: true,
    maxBatchSize: 100,
  });
};

// DataLoader para medicamentos
export const createMedicationLoader = () => {
  return new DataLoader(async (ids: readonly string[]) => {
    console.log(`[DataLoader] batching ${ids.length} medication ids`);
    
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .in('id', ids as string[]);

      if (error) {
        console.error('Error loading medications:', error);
        throw error;
      }

      // Crear mapa de medicamentos por ID
      const medicationMap = new Map<string, any>();
      data?.forEach(medication => {
        medicationMap.set(medication.id, {
          id: medication.id,
          commercialName: medication.commercial_name,
          activeIngredient: medication.active_ingredient,
          categoryId: medication.category_id,
          laboratory: medication.laboratory,
          presentation: medication.presentation,
          price: medication.price,
          stock: medication.stock,
          requiresPrescription: medication.requires_prescription,
          indications: medication.indications,
          contraindications: medication.contraindications,
          createdAt: medication.created_at,
        });
      });

      // Retornar en el mismo orden que los IDs solicitados
      return ids.map(id => medicationMap.get(id) || null);
    } catch (error) {
      console.error('Error in medication DataLoader:', error);
      throw error;
    }
  }, {
    // Configuración del DataLoader
    cache: true,
    maxBatchSize: 100,
  });
};

// DataLoader para pacientes
export const createPatientLoader = () => {
  return new DataLoader(async (ids: readonly string[]) => {
    console.log(`[DataLoader] batching ${ids.length} patient ids`);
    
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .in('id', ids as string[]);

      if (error) {
        console.error('Error loading patients:', error);
        throw error;
      }

      // Crear mapa de pacientes por ID
      const patientMap = new Map<string, any>();
      data?.forEach(patient => {
        patientMap.set(patient.id, {
          id: patient.id,
          fullName: patient.full_name,
          email: patient.email,
          createdAt: patient.created_at,
        });
      });

      // Retornar en el mismo orden que los IDs solicitados
      return ids.map(id => patientMap.get(id) || null);
    } catch (error) {
      console.error('Error in patient DataLoader:', error);
      throw error;
    }
  }, {
    // Configuración del DataLoader
    cache: true,
    maxBatchSize: 100,
  });
};

// DataLoader para items de orden
export const createOrderItemLoader = () => {
  return new DataLoader(async (orderIds: readonly string[]) => {
    console.log(`[DataLoader] batching ${orderIds.length} order items queries`);
    
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          medications (*)
        `)
        .in('order_id', orderIds as string[]);

      if (error) {
        console.error('Error loading order items:', error);
        throw error;
      }

      // Agrupar items por order_id
      const itemsByOrderId = new Map<string, any[]>();
      data?.forEach(item => {
        const orderId = item.order_id;
        if (!itemsByOrderId.has(orderId)) {
          itemsByOrderId.set(orderId, []);
        }
        
        itemsByOrderId.get(orderId)!.push({
          id: item.id,
          medicationId: item.medication_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          createdAt: item.created_at,
          medication: item.medications ? {
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
          } : null,
        });
      });

      // Retornar items para cada order_id solicitado
      return orderIds.map(orderId => itemsByOrderId.get(orderId) || []);
    } catch (error) {
      console.error('Error in order item DataLoader:', error);
      throw error;
    }
  }, {
    // Configuración del DataLoader
    cache: true,
    maxBatchSize: 50,
  });
};