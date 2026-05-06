import { z } from 'zod';
import { DEFAULT_CASE_RESOLVER_RELATION_NODE_META, DEFAULT_CASE_RESOLVER_RELATION_EDGE_META } from '@/shared/contracts/case-resolver/constants';

export const RelationNodeMetaSchema = z.object({
  entityType: z.enum(['case', 'folder', 'file', 'custom']).default('custom'),
  entityId: z.string().trim().min(1),
  label: z.string().trim().min(1),
  fileKind: z.enum(['case_file', 'asset_file']).nullable().default(null),
  folderPath: z.string().trim().nullable().default(null),
  sourceFileId: z.string().trim().nullable().default(null),
  isStructural: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RelationEdgeMetaSchema = z.object({
  relationType: z.enum(['contains', 'located_in', 'parent_case', 'references', 'related', 'custom']).default('related'),
  label: z.string().default(DEFAULT_CASE_RESOLVER_RELATION_EDGE_META.label),
  isStructural: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
