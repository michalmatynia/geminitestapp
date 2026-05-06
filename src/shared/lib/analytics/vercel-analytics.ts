/**
 * Vercel Analytics Integration
 * 
 * Configuration and utilities for Vercel Analytics integration.
 * Provides:
 * - Environment-based analytics enablement
 * - Vercel deployment detection
 * - Analytics rendering control
 * - Production vs development configuration
 * - Privacy-compliant analytics setup
 */

const ENABLE_VERCEL_ANALYTICS =
  process.env['NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS'] === 'true' ||
  (process.env['NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS'] !== 'false' &&
    Boolean(process.env['VERCEL_URL']));

export const shouldRenderVercelAnalytics = (): boolean => ENABLE_VERCEL_ANALYTICS;
