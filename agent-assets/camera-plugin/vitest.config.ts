import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: {
    '@deepseek-ai/dsh-client-ui-primitives': fileURLToPath(new URL('./test/primitives.tsx', import.meta.url)),
  } },
  test: { include: ['test/*.test.ts', 'test/*.test.tsx'] },
  oxc: { jsx: { runtime: 'automatic' } },
});
