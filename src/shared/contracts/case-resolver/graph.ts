import { z } from 'zod';
import { aiNodeSchema, type AiNode } from '../ai-paths-core';
import {
  caseResolverNodeRoleSchema,
  caseResolverQuoteModeSchema,
  caseResolverJoinModeSchema,
  caseResolverPdfExtractionPresetIdSchema,
  caseResolverFileTypeSchema,
  type CaseResolverNodeRole,
  type CaseResolverQuoteMode,
  type CaseResolverJoinMode,
  type CaseResolverPdfExtractionPresetId,
  type CaseResolverFileType,
} from './base';

/**
 * Case Resolver Meta & Graphs
 */
export const caseResolverNodeMetaSchema = z.object({
  role: caseResolverNodeRoleSchema.optional(),
  includeInOutput: z.boolean().optional(),
  quoteMode: caseResolverQuoteModeSchema.optional(),
  surroundPrefix: z.string().optional(),
  surroundSuffix: z.string().optional(),
  appendTrailingNewline: z.boolean().optional(),
  textColor: z.string().optional(),
  plainTextValidationEnabled: z.boolean().optional(),
  plainTextFormatterEnabled: z.boolean().optional(),
  plainTextValidationStackId: z.string().optional(),
});

export interface CaseResolverNodeMeta {
  role?: CaseResolverNodeRole;
  includeInOutput?: boolean;
  quoteMode?: CaseResolverQuoteMode;
  surroundPrefix?: string;
  surroundSuffix?: string;
  appendTrailingNewline?: boolean;
  textColor?: string;
  plainTextValidationEnabled?: boolean;
  plainTextFormatterEnabled?: boolean;
  plainTextValidationStackId?: string;
}

export const caseResolverEdgeMetaSchema = z.object({
  joinMode: caseResolverJoinModeSchema.optional(),
});

export interface CaseResolverEdgeMeta {
  joinMode?: CaseResolverJoinMode;
}

export const caseResolverEdgeSchema = z.object({
  id: z.string(),
  source: z.string().optional(),
  target: z.string().optional(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  type: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().nullable().optional(),
});

export type Edge = z.infer<typeof caseResolverEdgeSchema>;

export const caseResolverGraphSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(caseResolverEdgeSchema),
  nodeMeta: z.record(z.string(), caseResolverNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverEdgeMetaSchema).optional(),
  pdfExtractionPresetId: caseResolverPdfExtractionPresetIdSchema.optional(),
  documentFileLinksByNode: z.record(z.string(), z.array(z.string())).optional(),
  documentDropNodeId: z.string().nullable().optional(),
  documentSourceFileIdByNode: z.record(z.string(), z.string()).optional(),
  nodeFileAssetIdByNode: z.record(z.string(), z.string()).optional(),
});

export interface CaseResolverGraph {
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta?: Record<string, CaseResolverNodeMeta> | undefined;
  edgeMeta?: Record<string, CaseResolverEdgeMeta> | undefined;
  pdfExtractionPresetId?: CaseResolverPdfExtractionPresetId | undefined;
  documentFileLinksByNode?: Record<string, string[]> | undefined;
  documentDropNodeId?: string | null | undefined;
  documentSourceFileIdByNode?: Record<string, string> | undefined;
  nodeFileAssetIdByNode?: Record<string, string> | undefined;
}

/**
 * Case Resolver Node File Meta & Snapshots
 */
export const caseResolverNodeFileMetaSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  fileId: z.string(),
  assignedAt: z.string(),
});

export interface CaseResolverNodeFileMeta {
  id: string;
  nodeId: string;
  fileId: string;
  assignedAt: string;
}

export type CaseResolverNodeFileRelationIndex = {
  nodeIdsByDocumentFileId: Record<string, string[]>;
  nodeFileAssetIdsByDocumentFileId: Record<string, string[]>;
  documentFileIdsByNodeFileAssetId: Record<string, string[]>;
  nodeIdsByNodeFileAssetId: Record<string, string[]>;
};

export const EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX: CaseResolverNodeFileRelationIndex = {
  nodeIdsByDocumentFileId: {},
  nodeFileAssetIdsByDocumentFileId: {},
  documentFileIdsByNodeFileAssetId: {},
  nodeIdsByNodeFileAssetId: {},
};

export interface CaseResolverSnapshotNodeMeta {
  fileId: string;
  fileType: CaseResolverFileType;
  fileName: string;
}

export const caseResolverNodeFileSnapshotSchema = z.object({
  kind: z.literal('case_resolver_node_file_snapshot_v2'),
  nodes: z.array(aiNodeSchema),
  edges: z.array(caseResolverEdgeSchema),
  nodeMeta: z.record(z.string(), caseResolverNodeMetaSchema).optional(),
  edgeMeta: z.record(z.string(), caseResolverEdgeMetaSchema).optional(),
  nodeFileMeta: z.record(
    z.string(),
    z.object({
      fileId: z.string(),
      fileType: caseResolverFileTypeSchema,
      fileName: z.string(),
    })
  ),
});

export interface CaseResolverNodeFileSnapshot {
  kind: 'case_resolver_node_file_snapshot_v2';
  source?: 'manual' | 'auto' | undefined;
  nodes: AiNode[];
  edges: Edge[];
  nodeMeta?: Record<string, CaseResolverNodeMeta> | undefined;
  edgeMeta?: Record<string, CaseResolverEdgeMeta> | undefined;
  nodeFileMeta: Record<string, CaseResolverSnapshotNodeMeta>;
}
