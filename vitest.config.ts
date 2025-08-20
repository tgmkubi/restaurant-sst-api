import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: {
      '@kss-backend/core': path.resolve(__dirname, 'packages/core/src'),
      '@kss-backend/core/mainframe/core/middy': path.resolve(__dirname, 'packages/core/src/mainframe/core/middy.ts'),
      '@kss-backend/core/mainframe/helpers/response': path.resolve(__dirname, 'packages/core/src/mainframe/helpers/response.ts'),
      '@kss-backend/core/mainframe/database/interfaces/user': path.resolve(__dirname, 'packages/core/src/mainframe/database/interfaces/user.ts'),
      '@kss-backend/core/mainframe/database/mongodb/connect': path.resolve(__dirname, 'packages/core/src/mainframe/database/mongodb/connect.ts'),
    },
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
