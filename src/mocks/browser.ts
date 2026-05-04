/**
 * Mock Service Worker - Browser Setup
 * 
 * Configures MSW (Mock Service Worker) for browser environments.
 * Used for:
 * - API mocking during development and testing
 * - Intercepting HTTP requests without server setup
 * - Consistent mock responses across different environments
 * - Testing API integration without backend dependencies
 */

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * MSW Browser Setup
 * This worker intercepts HTTP requests in the browser environment
 * during development and testing
 */
export const worker = setupWorker(...handlers);
