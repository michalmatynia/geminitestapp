import { z } from 'zod';
import { dtoBaseSchema, type DtoBase } from '../base';
import { aiNodeSchema, edgeSchema } from '../ai-paths';

/**
 * Case Resolver Party References
 */
export const caseResolverPartyReferenceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  kind: z.enum(['person', 'organization']),
  role: z.string().optional(),
});

export type CaseResolverPartyReference = z.infer<typeof caseResolverPartyReferenceSchema>;

/**
 * Case Resolver Tags & Identifiers
 */
export const caseResolverTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export interface CaseResolverTag extends DtoBase {
  id: string;
  label: string;
  color?: string | undefined;
  parentId?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export const caseResolverIdentifierSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.string(),
  name: z.string().optional(),
  label: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export interface CaseResolverIdentifier extends DtoBase {
  id: string;
  type: string;
  value: string;
  name?: string | undefined;
  label?: string | undefined;
  parentId?: string | null | undefined;
  color?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Case Resolver Categories
 */
export const caseResolverCategorySchema = z.object({
  id: z.string(),
  parentId: z.string().nullable().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export interface CaseResolverCategory extends DtoBase {
  id: string;
  parentId?: string | null | undefined;
  name: string;
  sortOrder: number;
  description?: string | undefined;
  color?: string | undefined;
  icon?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export type CaseResolverCategoryTreeNode = CaseResolverCategory & {
  children: CaseResolverCategoryTreeNode[];
};

/**
 * Case Resolver Relation Contracts
 */
export const caseResolverRelationEntityTypeSchema = z.enum([
  'custom',
  'person',
  'organization',
  'place',
  'event',
  'date',
  'amount',
  'identifier',
  'case',
  'folder',
  'file',
]);
export type CaseResolverRelationEntityType = z.infer<typeof caseResolverRelationEntityTypeSchema>;

export const caseResolverRelationFileKindSchema = z
  .enum(['image', 'pdf', 'case_file', 'asset_file'])
  .nullable();
export type CaseResolverRelationFileKind = z.infer<typeof caseResolverRelationFileKindSchema>;

export const caseResolverRelationEdgeKindSchema = z.enum([
  'contains',
  'located_in',
  'parent_case',
  'references',
  'related',
  'custom',
]);
export type CaseResolverRelationEdgeKind = z.infer<typeof caseResolverRelationEdgeKindSchema>;

export const caseResolverRelationNodeMetaSchema = z.object({
  entityType: caseResolverRelationEntityTypeSchema,
  entityId: z.string(),
  label: z.string(),
  fileKind: caseResolverRelationFileKindSchema,
  folderPath: z.string().nullable(),
  sourceFileId: z.string().nullable(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverRelationNodeMeta = z.infer<typeof caseResolverRelationNodeMetaSchema>;

export const caseResolverRelationEdgeMetaSchema = z.object({
  relationType: caseResolverRelationEdgeKindSchema,
  label: z.string(),
  isStructural: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CaseResolverRelationEdgeMeta = z.infer<typeof caseResolverRelationEdgeMetaSchema>;

export const caseResolverRelationGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
  nodeMeta: z.record(z.string(), caseResolverRelationNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverRelationEdgeMetaSchema).optional(),
});

export type CaseResolverRelationGraph = z.infer<typeof caseResolverRelationGraphSchema>;
