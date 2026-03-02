import { z } from 'zod';

// ─── ContextNode Kind ──────────────────────────────────────────────────────────

export const contextNodeKindSchema = z.enum([
  'page',
  'component',
  'collection',
  'action',
  'policy',
]);
export type ContextNodeKind = z.infer<typeof contextNodeKindSchema>;

// ─── Permissions ──────────────────────────────────────────────────────────────

export const contextNodePermissionsSchema = z.object({
  readableBy: z.array(z.string()),
  actionableBy: z.array(z.string()),
});
export type ContextNodePermissions = z.infer<typeof contextNodePermissionsSchema>;

// ─── ContextNode ──────────────────────────────────────────────────────────────

export const contextNodeSchema = z.object({
  id: z.string().min(1),
  kind: contextNodeKindSchema,
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  owner: z.string().optional(),
  relatedIds: z.array(z.string()).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  examples: z.array(z.string()).optional(),
  permissions: contextNodePermissionsSchema.optional(),
  version: z.string(),
});
export type ContextNode = z.infer<typeof contextNodeSchema>;

// ─── Search ───────────────────────────────────────────────────────────────────

export const contextSearchRequestSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  kind: contextNodeKindSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ContextSearchRequest = z.infer<typeof contextSearchRequestSchema>;

export const contextSearchResponseSchema = z.object({
  nodes: z.array(contextNodeSchema),
  total: z.number(),
});
export type ContextSearchResponse = z.infer<typeof contextSearchResponseSchema>;

// ─── Resolve ──────────────────────────────────────────────────────────────────

export const contextResolveRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
});
export type ContextResolveRequest = z.infer<typeof contextResolveRequestSchema>;

export const contextResolveResponseSchema = z.object({
  nodes: z.array(contextNodeSchema),
  missing: z.array(z.string()),
});
export type ContextResolveResponse = z.infer<typeof contextResolveResponseSchema>;

// ─── Related ──────────────────────────────────────────────────────────────────

export const contextRelatedResponseSchema = z.object({
  sourceId: z.string(),
  nodes: z.array(contextNodeSchema),
});
export type ContextRelatedResponse = z.infer<typeof contextRelatedResponseSchema>;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const contextSchemaResponseSchema = z.object({
  entity: z.string(),
  schema: z.record(z.string(), z.unknown()).nullable(),
});
export type ContextSchemaResponse = z.infer<typeof contextSchemaResponseSchema>;

// ─── Context Pack (Phase 3 stub) ──────────────────────────────────────────────

export const contextPackSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  nodeIds: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  kinds: z.array(contextNodeKindSchema).optional(),
});
export type ContextPack = z.infer<typeof contextPackSchema>;
