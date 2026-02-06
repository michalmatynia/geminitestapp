import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * MSW Browser Setup
 * This worker intercepts HTTP requests in the browser environment
 * during development and testing
 */
export const worker = setupWorker(...handlers);
