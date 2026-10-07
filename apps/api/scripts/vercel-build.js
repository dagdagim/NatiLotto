// Vercel build runner for Nati Lotto API
// Strips any local/Windows-specific PRISMA binary overrides from environment
delete process.env.PRISMA_SCHEMA_ENGINE_BINARY;
delete process.env.PRISMA_QUERY_ENGINE_LIBRARY;

const { execSync } = require('child_process');

console.log('[vercel-build] Generating Prisma Client for Vercel...');

// Clean environment specifically for Prisma invocation
const cleanEnv = { ...process.env };
delete cleanEnv.PRISMA_SCHEMA_ENGINE_BINARY;
delete cleanEnv.PRISMA_QUERY_ENGINE_LIBRARY;

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: cleanEnv,
  });
} catch (err) {
  console.error('[vercel-build] Prisma generate failed:', err.message);
  process.exit(1);
}

console.log('[vercel-build] Compiling NestJS application...');
try {
  execSync('npm run build', {
    stdio: 'inherit',
    env: cleanEnv,
  });
} catch (err) {
  console.error('[vercel-build] NestJS build failed:', err.message);
  process.exit(1);
}

console.log('[vercel-build] Build successfully completed!');
