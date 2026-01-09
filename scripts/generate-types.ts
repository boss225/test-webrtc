/**
 * Script to generate TypeScript types from Supabase
 * Run: npx tsx scripts/generate-types.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_PROJECT_ID = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];

if (!SUPABASE_PROJECT_ID) {
  console.error('❌ SUPABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('🔄 Generating Supabase types...');

try {
  // Generate types using Supabase CLI
  const command = `npx supabase gen types typescript --project-id ${SUPABASE_PROJECT_ID} > lib/supabase-database.types.ts`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('✅ Types generated successfully!');
  console.log('📝 File created: lib/supabase-database.types.ts');
  console.log('');
  console.log('💡 Next steps:');
  console.log('1. Review the generated types');
  console.log('2. Merge with lib/supabase-types.ts if needed');
} catch (error) {
  console.error('❌ Error generating types:', error);
  process.exit(1);
}