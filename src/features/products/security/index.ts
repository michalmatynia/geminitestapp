/**
 * Product Security Module
 * 
 * Comprehensive security layer for product-related operations.
 * Provides:
 * - Input sanitization and XSS prevention
 * - Rate limiting and DoS protection
 * - Secure file upload handling
 * - Security middleware integration
 * - Threat detection and logging
 */

// Input sanitization
export * from './input-sanitization';

// Rate limiting
export * from './rate-limiting';

// File upload security
export * from './file-upload';

// Security middleware
export * from './middleware';

// Re-export main instances and utilities
export { InputSanitizer, ProductSanitizationRules } from './input-sanitization';
export { rateLimiters, RateLimiter } from './rate-limiting';
export { SecureFileUpload } from './file-upload';
export { SecurityMiddleware, withSecurity, withFileUploadSecurity } from './middleware';
