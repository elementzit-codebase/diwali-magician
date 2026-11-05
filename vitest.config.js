import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially so database state does not collide
    fileParallelism: false,
    environment: 'node',
  },
});

