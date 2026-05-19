/**
 * Image Studio Feature - Server Entry Point
 *
 * This module serves as the server-only entry point for the Image Studio feature.
 * It exports repositories and services for managing image generation, variants, and metadata.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - ProductStudioService: Business logic for product image studio operations
 * - StudioSettings: Configuration and settings management
 * - RunRepository: Data access for image generation runs
 * - SequenceRunRepository: Data access for batch/sequence image operations
 * - SlotRepository & SlotLinkRepository: Data access for image slots and relationships
 *
 * Example usage:
 * import { ProductStudioService, RunRepository } from '@/features/ai/image-studio/server';
 */

export * from './product-studio/product-studio-service';
export * from './studio-settings';
export * from './server/run-repository';
export * from './server/sequence-run-repository';
export * from './server/slot-repository';
export * from './server/slot-link-repository';
export * from './server/types';
