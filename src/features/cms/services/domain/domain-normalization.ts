/**
 * Domain Normalization Service
 * 
 * Provides standardized routines for host and domain string normalization.
 */

import { ErrorSystem } from '@/shared/utils/observability/error-system';

/**
 * Fallback host when the environment or headers are missing.
 */
export const getFallbackDomain = (): string => {
  const url =
    process.env['NEXT_PUBLIC_APP_URL'] ?? process.env['NEXTAUTH_URL'] ?? 'http://localhost';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return 'default';
  }
};

/**
 * Normalizes a host string from headers or user input.
 */
export const normalizeHost = (hostHeader: string | null | undefined): string => {
  if (hostHeader === null || hostHeader === undefined || hostHeader.trim() === '') {
    return getFallbackDomain();
  }
  const raw = hostHeader.split(',')[0]?.trim();
  if (raw === undefined || raw === '') return getFallbackDomain();
  try {
    return new URL(`http://${raw}`).hostname.toLowerCase();
  } catch (error) {
    void ErrorSystem.captureException(error);
    return raw.toLowerCase();
  }
};
