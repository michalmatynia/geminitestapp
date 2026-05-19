/**
 * AI Insights Feature - Server Entry Point
 *
 * This module serves as the server-only entry point for the AI Insights feature.
 * It exports repositories and services for generating analytics and insights about platform activity.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - InsightsRepository: Data access for insights data and metadata
 * - InsightsGenerator: Service for generating AI-powered analytics
 * - InsightsSettings: Configuration and settings management
 *
 * Example usage:
 * import { InsightsGenerator, InsightsRepository } from '@/features/ai/insights/server';
 */

export * from './repository';
export * from './generator';
export * from './settings';
