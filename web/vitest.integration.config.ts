import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        name: 'integration',
        environment: 'node',
        globals: true,
        setupFiles: ['./src/__tests__/integration/setup.ts'],
        include: ['src/__tests__/integration/**/*.integration.test.ts'],
        testTimeout: 10000,
        hookTimeout: 10000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
