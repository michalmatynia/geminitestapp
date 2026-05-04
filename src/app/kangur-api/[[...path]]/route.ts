/**
 * Kangur API Route Proxy
 * 
 * Proxies Kangur API requests to the main API handler.
 * Provides:
 * - Alternative API endpoint for Kangur-specific requests
 * - Consistent routing for educational platform features
 * - HTTP method support (GET, POST, PATCH, DELETE)
 * - Seamless integration with main API infrastructure
 */

export { DELETE, GET, PATCH, POST } from '../../api/kangur/[[...path]]/route';
