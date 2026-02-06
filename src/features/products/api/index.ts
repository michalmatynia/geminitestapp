// Client-safe Product API surface.
//
// IMPORTANT:
// - Do NOT export server-only helpers (route-handler wrappers, NextRequest-based versioning, etc.) from here.
// - Client components import from "@/features/products/api" and must remain bundle-safe.

export * from './products';
export * from './settings';
export * from './errors';
