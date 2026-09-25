const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkTypeScriptErrors() {
  console.log('🔍 Checking TypeScript errors...\n');
  
  try {
    // Intentar compilar con configuración simple
    const { stdout, stderr } = await execAsync('npx tsc --project tsconfig.simple.json --noEmit');
    
    if (stderr) {
      console.log('❌ TypeScript errors found:');
      console.log(stderr);
    } else {
      console.log('✅ No TypeScript errors found!');
    }
  } catch (error) {
    console.log('❌ Error checking TypeScript:');
    console.log(error.stderr || error.message);
    
    // Mostrar errores comunes
    console.log('\n🔧 Common fixes:');
    console.log('1. Check imports in context.ts and server.ts');
    console.log('2. Make sure all dependencies are installed');
    console.log('3. Try removing strict mode from tsconfig.json');
  }
}

checkTypeScriptErrors();