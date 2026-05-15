/**
 * Outbound URL Policy Enforcement
 * 
 * This module provides a centralized security policy for controlling outbound 
 * network requests. It prevents Server-Side Request Forgery (SSRF) and other 
 * network-based attacks by strictly validating destination URLs.
 * 
 * Features:
 * - Host-based URL filtering and allow-listing.
 * - Suffix-based domain rule matching.
 * - Automatic normalization and hostname extraction for requests.
 * - Strict blocking of internal hostnames (e.g., metadata services, local infrastructure).
 * - Detailed decision logging and policy violation reporting.
 * 
 * Usage:
 * Use `checkOutboundUrlPolicy` to validate a URL before performing any outbound
 * request (e.g., in a fetch wrapper or proxy).
 */

import { reportObservabilityInternalError } from '@/shared/utils/observability/internal-observability-fallback';

/** Defines a rule for matching outbound hostnames */
type OutboundHostRule = {
  raw: string;
  suffix: boolean;
  value: string;
};

/** The result of a security policy evaluation for an outbound URL */
export type OutboundUrlPolicyDecision = {
  allowed: boolean;           // Whether the URL is allowed by policy
  reason: string | null;      // Explanation for the decision (e.g., "denied by policy")
  hostname: string | null;    // Extracted hostname from the target URL
  normalizedUrl: string | null; // The sanitized, normalized URL string
};

/**
 * Error thrown when an outbound URL request violates the established security policy.
 * Provides the decision context for logging and security monitoring.
 */
export class OutboundUrlPolicyError extends Error {
  decision: OutboundUrlPolicyDecision;

  constructor(message: string, decision: OutboundUrlPolicyDecision) {
    super(message);
    this.name = 'OutboundUrlPolicyError';
    this.decision = decision;
  }
}

/** Local hostnames and internal services that must always be blocked to prevent SSRF */
const LOCAL_HOSTS = new Set<string>([
  'localhost',
  'localhost.localdomain',
  'host.docker.internal',
  'metadata.google.internal',
  'metadata',
]);

/** Private metadata service IPs/hostnames that should be blocked (e.g., cloud provider metadata) */
// ... (rest of file remains same)
