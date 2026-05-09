/**
 * Client Redaction Utilities
 * 
 * Re-exports redaction utilities for client-side use.
 * Provides access to sensitive data redaction functions
 * for client-side error reporting and logging.
 */

export {
  isSensitiveKey,
  REDACTED_VALUE,
  redactSensitiveText,
  truncateString,
} from '@/shared/utils/observability/redaction-policy';
