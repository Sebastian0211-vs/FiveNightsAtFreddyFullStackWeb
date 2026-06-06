import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // Backend tests run in Node, frontend tests in jsdom
        environmentMatchGlobs: [
            ['server/**', 'node'],
            ['src/**', 'jsdom'],
        ],
        environment: 'node',
        include: [
            'server/src/tests/**/*.test.{js,jsx}',
            'src/react/__tests__/**/*.test.{js,jsx}',
        ],
        setupFiles: ['server/src/tests/setup.js', 'src/react/__tests__/setup.js'],
        globals: false,
    },
});
