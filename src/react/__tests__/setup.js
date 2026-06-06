import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL doesn't auto-cleanup when vitest globals are disabled
afterEach(() => cleanup());

vi.stubEnv('VITE_API_URL', 'http://test.local');
vi.stubEnv('VITE_GRAPHQL_URL', 'http://test.local/graphql');
