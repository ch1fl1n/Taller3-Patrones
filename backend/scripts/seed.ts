import { supabase } from '../src/datasources/supabaseClient';
import { DEMO_PATIENT_ID } from '../src/context';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface MedicationCSV {
  commercial_name: string;
  active_ingredient: string;
  category: string;
  laboratory: string;
  presentation: string;
  price: string;
  stock: string;
  requires_prescription: string;
  indications: string;
  contraindications: string;
}

async function seedDatabase() {
  console.log('🌱 Iniciando seed de la base de datos...');

  try {
    // 1. Leer el archivo CSV
    const csvPath = path.join(__dirname, '../../scripts/medications_dataset.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    const records: MedicationCSV[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`📊 Encontrados ${records.length} medicamentos en el CSV`);

    // 2. Extraer categorías únicas
    const uniqueCategories = [...new Set(records.map(r => r.category.trim()))];
    console.log(`🏷️  Categorías únicas encontradas: ${uniqueCategories.length}`);

    // 3. Insertar categorías
    const categoryMap = new Map<string, string>();
    
    for (const categoryName of uniqueCategories) {
      const { data: existingCategory, error: checkError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar categoría:', checkError);
        continue;
      }

      if (!existingCategory) {
        const newCategory = {
          id: uuidv4(),
          name: categoryName,
        };

        const { data, error } = await supabase
          .from('categories')
          .insert(newCategory)
          .select('id')
          .single();

        if (error) {
          console.error(`Error al insertar categoría ${categoryName}:`, error);
          continue;
        }

        categoryMap.set(categoryName, data.id);
        console.log(`✅ Categoría insertada: ${categoryName}`);
      } else {
        categoryMap.set(categoryName, existingCategory.id);
      }
    }

    // 4. Insertar medicamentos
    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of records) {
      // Verificar si el medicamento ya existe
      const { data: existingMedication, error: checkError } = await supabase
        .from('medications')
        .select('id')
        .eq('commercial_name', record.commercial_name.trim())
        .eq('active_ingredient', record.active_ingredient.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar medicamento:', checkError);
        continue;
      }

      if (existingMedication) {
        console.log(`⏭️  Medicamento ya existe: ${record.commercial_name}`);
        skippedCount++;
        continue;
      }

      const categoryId = categoryMap.get(record.category.trim());

      const medication = {
        id: uuidv4(),
        commercial_name: record.commercial_name.trim(),
        active_ingredient: record.active_ingredient.trim(),
        category_id: categoryId || null,
        laboratory: record.laboratory.trim(),
        presentation: record.presentation.trim(),
        price: parseFloat(record.price),
        stock: parseInt(record.stock),
        requires_prescription: record.requires_prescription.toLowerCase() === 'true',
        indications: record.indications.trim() || null,
        contraindications: record.contraindications.trim() || null,
      };

      const { error } = await supabase
        .from('medications')
        .insert(medication);

      if (error) {
        console.error(`Error al insertar medicamento ${record.commercial_name}:`, error);
        continue;
      }

      insertedCount++;
      console.log(`✅ Medicamento insertado: ${record.commercial_name}`);
    }

    // 5. Insertar paciente de ejemplo
    const { data: existingPatient, error: patientCheckError } = await supabase
      .from('patients')
      .select('id')
      .eq('email', 'paciente@ejemplo.com')
      .single();

    if (patientCheckError && patientCheckError.code !== 'PGRST116') {
      console.error('Error al verificar paciente:', patientCheckError);
    }

    if (!existingPatient) {
      const patient = {
        id: DEMO_PATIENT_ID,
        full_name: 'Juan Pérez',
        email: 'paciente@ejemplo.com',
      };

      const { error } = await supabase
        .from('patients')
        .insert(patient);

      if (error) {
        console.error('Error al insertar paciente:', error);
      } else {
        console.log('✅ Paciente de ejemplo insertado');
      }
    }

    // 6. Verificar conteos
    const { count: medicationCount } = await supabase
      .from('medications')
      .select('*', { count: 'exact', head: true });

    const { count: categoryCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Resumen del seed:');
    console.log(`📈 Medicamentos insertados: ${insertedCount}`);
    console.log(`⏭️  Medicamentos existentes (skipped): ${skippedCount}`);
    console.log(`🏷️  Categorías en base de datos: ${categoryCount ?? 0}`);
    console.log(`💊 Total medicamentos en BD: ${medicationCount ?? 0}`);
    
    if (medicationCount === 50) {
      console.log('🎯 ¡Objetivo alcanzado! 50 medicamentos cargados correctamente.');
    } else {
      console.log(`⚠️  Objetivo no alcanzado: ${medicationCount ?? 0}/50 medicamentos`);
    }

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar el seed
seedDatabase().catch(console.error);