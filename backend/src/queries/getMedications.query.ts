import { supabase } from '../datasources/supabaseClient';
import { MedicationFilterInput } from '../types';

export interface GetMedicationsParams {
  filter?: MedicationFilterInput;
}

export interface MedicationSummary {
  id: string;
  commercialName: string;
  activeIngredient: string;
  categoryId: string | null;
  price: number;
  presentation: string;
  laboratory: string;
  requiresPrescription: boolean;
  inStock: boolean;
}

export interface GetMedicationsResult {
  items: MedicationSummary[];
  totalCount: number;
}

export async function getMedications(
  params: GetMedicationsParams
): Promise<GetMedicationsResult> {
  const { filter = {} } = params;
  const {
    search,
    categoryId,
    activeIngredient,
    requiresPrescription,
    inStock,
    minPrice,
    maxPrice,
    limit = 20,
    offset = 0,
  } = filter;

  // Construir consulta base usando la vista medication_summary
  let query = supabase.from('medication_summary').select('*', { count: 'exact' });

  // Aplicar filtros
  // El texto va dentro de un filtro de PostgREST: se quitan los caracteres con significado
  // en esa sintaxis (, . ( ) " \\) y los comodines de LIKE (% _ *) para evitar inyección de filtros.
  const safeSearch = search?.replace(/[,.()"\\%_*]/g, ' ').trim();
  if (safeSearch) {
    query = query.or(`commercial_name.ilike.%${safeSearch}%,active_ingredient.ilike.%${safeSearch}%`);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const safeIngredient = activeIngredient?.replace(/[%_*\\]/g, ' ').trim();
  if (safeIngredient) {
    query = query.ilike('active_ingredient', `%${safeIngredient}%`);
  }

  if (requiresPrescription !== undefined) {
    query = query.eq('requires_prescription', requiresPrescription);
  }

  if (inStock !== undefined) {
    query = query.eq('in_stock', inStock);
  }

  if (minPrice !== undefined) {
    query = query.gte('price', minPrice);
  }

  if (maxPrice !== undefined) {
    query = query.lte('price', maxPrice);
  }

  // Aplicar paginación
  query = query.range(offset, offset + limit - 1);

  // Ordenar por nombre comercial
  query = query.order('commercial_name');

  // Ejecutar consulta
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching medications:', error);
    throw new Error(`Failed to fetch medications: ${error.message}`);
  }

  // Transformar datos
  const items: MedicationSummary[] = (data || []).map(item => ({
    id: item.id,
    commercialName: item.commercial_name,
    activeIngredient: item.active_ingredient || '',
    categoryId: item.category_id,
    price: item.price,
    presentation: item.presentation,
    laboratory: item.laboratory,
    requiresPrescription: item.requires_prescription,
    inStock: item.in_stock,
  }));

  return {
    items,
    totalCount: count || 0,
  };
}

// Función para obtener medicamento por ID (ficha detallada)
export async function getMedicationById(id: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching medication ${id}:`, error);
    throw new Error(`Medication not found: ${id}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    commercialName: data.commercial_name,
    activeIngredient: data.active_ingredient,
    categoryId: data.category_id,
    laboratory: data.laboratory,
    presentation: data.presentation,
    price: data.price,
    stock: data.stock,
    requiresPrescription: data.requires_prescription,
    indications: data.indications,
    contraindications: data.contraindications,
    createdAt: data.created_at,
  };
}

// Función para obtener todas las categorías
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []).map(category => ({
    id: category.id,
    name: category.name,
    createdAt: category.created_at,
  }));
}