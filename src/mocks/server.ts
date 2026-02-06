import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW Server Setup
 * This server intercepts HTTP requests in Node.js environment
 * Used for testing with Vitest and other Node.js-based test runners
 */
export const server = setupServer(...handlers);
