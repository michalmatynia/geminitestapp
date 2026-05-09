/**
 * Source Service Utilities
 * 
 * Service identification and resolution from source strings.
 * Provides:
 * - Source string parsing and normalization
 * - HTTP method segment detection
 * - Service name extraction
 * - Segment filtering and cleanup
 * - Source-to-service mapping
 */

/**
 * Common HTTP method names that might appear at the end of a source string.
 */
const HTTP_METHOD_SEGMENTS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Splits a source string into normalized segments.
 * 
 * @param source - The raw source string (e.g. "orders.api.GET").
 * @returns An array of trimmed, non-empty segments.
 */
const normalizeSourceSegments = (source: string | undefined): string[] =>
  (source?.trim() ?? '').split('.').filter(Boolean);

/**
 * Removes the trailing HTTP method segment if present.
 * 
 * @param segments - Array of source segments.
 * @returns Array of segments without the trailing method.
 */
const stripTrailingMethodSegment = (segments: string[]): string[] => {
  const maybeMethod = segments[segments.length - 1];
  return maybeMethod && HTTP_METHOD_SEGMENTS.has(maybeMethod) ? segments.slice(0, -1) : segments;
};

/**
 * Resolves a service identifier from a source string.
 * Typically extracts the first two segments (e.g. "feature.subservice").
 * 
 * @param source - The source string to resolve from.
 * @param fallbackService - The service name to use if resolution fails.
 * @returns The resolved service identifier.
 */
export const resolveServiceFromSource = (
  source: string | undefined,
  fallbackService: string
): string => {
  const baseSegments = stripTrailingMethodSegment(normalizeSourceSegments(source));
  
  // Logic: Prefer the first two segments for specificity (e.g. "products.api")
  const first = baseSegments[0];
  const second = baseSegments[1];
  
  if (first && second) return `${first}.${second}`;
  if (first) return first;
  
  return fallbackService;
};
