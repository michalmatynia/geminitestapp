// Core interfaces and types
export * from './interfaces';

// Error handling
export * from './errors';

// Services (domain layer)
export * from './services';

// Infrastructure implementations
export * from './infrastructure';

// Application orchestration
export * from './application';

// Re-export main application instance for easy access
export { validationApp as ValidationApp } from './application';