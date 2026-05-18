/**
 * Shared UI System
 *
 * This package serves as the centralized library for the platform's design system.
 * It provides shared UI components, layouts, primitives, and interaction patterns
 * used across the entire application.
 *
 * @deprecated Avoid direct barrel imports from this entry point. 
 * Prefer importing specific domain modules directly from `@/shared/ui/[domain].public`.
 */
export * from './admin.public';
export * from './primitives.public';
export * from './forms-and-actions.public';
export * from './navigation-and-layout.public';
export * from './data-display.public';
export * from './media.public';
export * from './feedback.public';
export { DocumentationTooltipEnhancer as DocsTooltipEnhancer } from '@/shared/lib/documentation/DocumentationTooltipEnhancer';
export * from './templates.public';
