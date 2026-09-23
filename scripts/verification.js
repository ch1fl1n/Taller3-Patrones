#!/usr/bin/env node

/**
 * Script de verificación para Afirmative Pill
 * Verifica que todas las funcionalidades principales estén funcionando correctamente
 */

const { ApolloClient, InMemoryCache, HttpLink, gql } = require('@apollo/client');
const fetch = require('cross-fetch');

// Configuración
const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Crear cliente Apollo
const client = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_ENDPOINT, fetch }),
  cache: new InMemoryCache(),
});

// Queries de prueba
const TEST_QUERIES = {
  getMedications: gql`
    query GetMedicationsTest {
      medications(filter: { limit: 5 }) {
        items {
          id
          commercialName
          price
          stock
          requiresPrescription
          inStock
          category {
            id
            name
          }
        }
        totalCount
        pageInfo {
          hasNextPage
          totalPages
        }
      }
    }
  `,

  getCategories: gql`
    query GetCategoriesTest {
      categories {
        id
        name
      }
    }
  `,

  createOrder: gql`
    mutation CreateOrderTest($input: CreateOrderInput!) {
      createOrder(input: $input) {
        __typename
        ... on CreateOrderSuccess {
          order {
            id
            status
            total
            items {
              medication {
                commercialName
              }
              quantity
              unitPrice
            }
          }
        }
        ... on InsufficientStockError {
          message
          medicationId
        }
        ... on PrescriptionRequiredError {
          message
          medicationIds
        }
      }
    }
  `,
};

async function testConnection() {
  console.log('🔌 Probando conexión al servidor GraphQL...');
  
  try {
    const response = await fetch('http://localhost:4000/health');
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    console.log(`✅ Servidor funcionando: ${health.status}`);
    console.log(`📊 Versión: ${health.version}`);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    console.log('💡 Asegúrate de que el servidor esté ejecutándose en http://localhost:4000');
    return false;
  }
}

async function testGetMedications() {
  console.log('\n📊 Probando query de medicamentos...');
  
  try {
    const result = await client.query({
      query: TEST_QUERIES.getMedications,
      fetchPolicy: 'no-cache',
    });

    const { items, totalCount } = result.data.medications;
    
    if (items.length > 0) {
      console.log(`✅ Query exitosa: ${items.length} medicamentos obtenidos`);
      console.log(`📈 Total en base de datos: ${totalCount} medicamentos`);
      
      // Verificar que se cargó el dataset completo
      if (totalCount >= 50) {
        console.log('🎯 Dataset completo cargado (50+ medicamentos)');
      } else {
        console.log(`⚠️  Dataset incompleto: ${totalCount}/50 medicamentos`);
      }
      
      // Mostrar ejemplo de medicamento
      const sampleMed = items[0];
      console.log(`💊 Ejemplo: ${sampleMed.commercialName} - ${sampleMed.price} COP`);
      
      return true;
    } else {
      console.error('❌ No se encontraron medicamentos');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en query de medicamentos:', error.message);
    return false;
  }
}

async function testGetCategories() {
  console.log('\n🏷️  Probando query de categorías...');
  
  try {
    const result = await client.query({
      query: TEST_QUERIES.getCategories,
      fetchPolicy: 'no-cache',
    });

    const categories = result.data.categories;
    
    if (categories.length > 0) {
      console.log(`✅ Query exitosa: ${categories.length} categorías obtenidas`);
      
      // Mostrar categorías
      console.log('📋 Categorías disponibles:');
      categories.forEach(cat => {
        console.log(`   • ${cat.name}`);
      });
      
      return true;
    } else {
      console.error('❌ No se encontraron categorías');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en query de categorías:', error.message);
    return false;
  }
}

async function testCreateOrder() {
  console.log('\n🛒 Probando creación de orden...');
  
  try {
    // Primero necesitamos obtener un medicamento disponible
    const medResult = await client.query({
      query: TEST_QUERIES.getMedications,
      fetchPolicy: 'no-cache',
    });

    const medications = medResult.data.medications.items;
    const availableMed = medications.find(m => m.inStock && !m.requiresPrescription);
    
    if (!availableMed) {
      console.log('⚠️  No hay medicamentos disponibles para prueba, probando con error...');
      return testOrderErrors();
    }

    console.log(`📦 Usando medicamento: ${availableMed.commercialName}`);
    
    const result = await client.mutate({
      mutation: TEST_QUERIES.createOrder,
      variables: {
        input: {
          items: [
            {
              medicationId: availableMed.id,
              quantity: 1,
            },
          ],
        },
      },
    });

    const { __typename } = result.data.createOrder;
    
    if (__typename === 'CreateOrderSuccess') {
      console.log('✅ Orden creada exitosamente');
      const order = result.data.createOrder.order;
      console.log(`   ID: ${order.id}`);
      console.log(`   Estado: ${order.status}`);
      console.log(`   Total: ${order.total} COP`);
      return true;
    } else {
      console.log(`⚠️  Orden no creada: ${__typename}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en creación de orden:', error.message);
    return false;
  }
}

async function testOrderErrors() {
  console.log('\n⚠️  Probando manejo de errores en órdenes...');
  
  try {
    // Probar con cantidad mayor al stock (debería fallar)
    const medResult = await client.query({
      query: TEST_QUERIES.getMedications,
      fetchPolicy: 'no-cache',
    });

    const medications = medResult.data.medications.items;
    const anyMed = medications[0];
    
    if (!anyMed) {
      console.log('❌ No hay medicamentos para probar errores');
      return false;
    }

    const result = await client.mutate({
      mutation: TEST_QUERIES.createOrder,
      variables: {
        input: {
          items: [
            {
              medicationId: anyMed.id,
              quantity: 999999, // Cantidad imposible
            },
          ],
        },
      },
    });

    const { __typename } = result.data.createOrder;
    
    if (__typename === 'InsufficientStockError') {
      console.log('✅ Error de stock manejado correctamente');
      return true;
    } else {
      console.log(`⚠️  Error inesperado: ${__typename}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba de errores:', error.message);
    return false;
  }
}

async function testDataLoader() {
  console.log('\n⚡ Probando DataLoader (mitigación N+1)...');
  
  try {
    // Esta query debería activar DataLoader cuando se resuelvan las categorías
    const result = await client.query({
      query: gql`
        query TestDataLoader {
          medications(filter: { limit: 10 }) {
            items {
              id
              commercialName
              category {
                id
                name
              }
            }
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });

    if (result.data.medications.items.length > 0) {
      console.log('✅ Query con relaciones ejecutada');
      console.log('💡 Revisa los logs del servidor para ver mensajes de DataLoader:');
      console.log('   "[DataLoader] batching X category ids"');
      console.log('   Esto indica que se están agrupando consultas para evitar N+1');
      return true;
    } else {
      console.error('❌ No se pudieron obtener medicamentos para prueba');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba DataLoader:', error.message);
    return false;
  }
}

async function testGraphQLSchema() {
  console.log('\n📝 Probando schema GraphQL...');
  
  try {
    // Query para obtener schema introspection
    const result = await client.query({
      query: gql`
        query IntrospectionQuery {
          __schema {
            queryType {
              name
            }
            mutationType {
              name
            }
            subscriptionType {
              name
            }
            types {
              name
              kind
            }
          }
        }
      `,
      fetchPolicy: 'no-cache',
    });

    const schema = result.data.__schema;
    
    console.log('✅ Schema GraphQL disponible');
    console.log(`   Query Type: ${schema.queryType.name}`);
    console.log(`   Mutation Type: ${schema.mutationType?.name || 'No disponible'}`);
    console.log(`   Subscription Type: ${schema.subscriptionType?.name || 'No disponible'}`);
    
    // Contar tipos
    const typeCount = schema.types.length;
    console.log(`   Total de tipos: ${typeCount}`);
    
    // Verificar tipos importantes
    const importantTypes = ['Medication', 'Order', 'Category', 'Patient', 'CreateOrderResult'];
    const foundTypes = schema.types.filter(t => importantTypes.includes(t.name));
    
    console.log(`   Tipos importantes encontrados: ${foundTypes.length}/${importantTypes.length}`);
    foundTypes.forEach(t => {
      console.log(`     ✓ ${t.name} (${t.kind})`);
    });
    
    return foundTypes.length >= 4;
  } catch (error) {
    console.error('❌ Error en introspection:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 INICIANDO VERIFICACIÓN COMPLETA DE AFIRMATIVE PILL 🧪\n');
  
  const tests = [
    { name: 'Conexión al servidor', test: testConnection },
    { name: 'Schema GraphQL', test: testGraphQLSchema },
    { name: 'Consulta de medicamentos', test: testGetMedications },
    { name: 'Consulta de categorías', test: testGetCategories },
    { name: 'DataLoader (N+1)', test: testDataLoader },
    { name: 'Creación de orden', test: testCreateOrder },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PRUEBA: ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const result = await test.test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error en prueba ${test.name}:`, error.message);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('RESUMEN DE VERIFICACIÓN');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Pruebas pasadas: ${passed}`);
  console.log(`❌ Pruebas fallidas: ${failed}`);
  console.log(`📊 Total: ${passed + failed} pruebas ejecutadas`);
  
  if (failed === 0) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    console.log('✨ El proyecto Afirmative Pill está funcionando correctamente.');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
  }

  console.log('\n💡 Próximos pasos:');
  console.log('   1. Verifica que el frontend esté funcionando: http://localhost:3000');
  console.log('   2. Prueba las subscriptions en GraphQL Playground');
  console.log('   3. Verifica el manejo de prescripciones médicas');
}

// Ejecutar pruebas
runAllTests().catch(error => {
  console.error('❌ Error fatal en verificación:', error);
  process.exit(1);
});