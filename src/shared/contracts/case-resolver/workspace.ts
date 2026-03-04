import { z } from 'zod';
import { namedDtoSchema, type NamedDto } from '../base';
import { documentEditorModeSchema } from '../document-editor';
import {
  caseResolverDefaultDocumentFormatSchema,
  type CaseResolverDefaultDocumentFormat,
} from './base';
import {
  caseResolverFileSchema,
  caseResolverAssetFileSchema,
  caseResolverFolderRecordSchema,
  caseResolverFolderTimestampSchema,
  type CaseResolverFile,
  type CaseResolverAssetFile,
  type CaseResolverFolderRecord,
  type CaseResolverFolderTimestamp,
} from './file';
import { caseResolverEdgeMetaSchema } from './graph';
import { type CaseResolverRelationGraph } from './relations';

/**
 * Case Resolver Workspace & Folders
 */
export const caseResolverWorkspaceSchema = namedDtoSchema.extend({
  ownerId: z.string(),
  isPublic: z.boolean(),
  version: z.number().optional(),
  activeFileId: z.string().nullable().optional(),
  files: z.array(caseResolverFileSchema).optional(),
  assets: z.array(caseResolverAssetFileSchema).optional(),
  folders: z.array(z.string()).optional(),
  folderRecords: z.array(caseResolverFolderRecordSchema).optional(),
  folderTimestamps: z.record(z.string(), caseResolverFolderTimestampSchema).optional(),
  workspaceRevision: z.number().optional(),
  lastMutationId: z.string().nullable().optional(),
  lastMutationAt: z.string().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export interface CaseResolverWorkspace extends NamedDto {
  id: string;
  ownerId: string;
  isPublic: boolean;
  version: number;
  activeFileId: string | null;
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  folders: string[];
  folderRecords: CaseResolverFolderRecord[];
  folderTimestamps: Record<string, CaseResolverFolderTimestamp>;
  workspaceRevision: number;
  lastMutationId: string | null;
  lastMutationAt: string | null;
  relationGraph: CaseResolverRelationGraph;
  settings?: Record<string, unknown> | undefined;
}

export type CaseResolverWorkspaceMetadata = {
  revision: number;
  lastMutationId: string | null;
  exists: boolean;
};

export type CaseResolverWorkspaceFetchAttemptProfile = 'default' | 'context_fast';

export type CaseResolverWorkspaceRecordFetchResult =
  | {
      status: 'resolved';
      workspace: CaseResolverWorkspace;
      attemptKey: string;
      scope: 'light' | 'heavy';
      source: 'resolved_v2';
      durationMs: number;
    }
  | {
      status: 'missing_required_file';
      attemptKey: string | null;
      durationMs: number;
      message: string;
    }
  | {
      status: 'no_record';
      durationMs: number;
      message: string;
    }
  | {
      status: 'unavailable';
      reason: 'transport_error' | 'budget_exhausted';
      durationMs: number;
      message: string;
    };

export type CaseResolverWorkspaceDebugEvent = {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  message?: string | undefined;
  mutationId?: string | null | undefined;
  expectedRevision?: number | null | undefined;
  currentRevision?: number | null | undefined;
  workspaceRevision?: number | null | undefined;
  durationMs?: number | undefined;
  payloadBytes?: number | undefined;
};

export type CaseResolverWorkspaceFetchIfStaleResult =
  | { updated: false; revision: number }
  | { updated: true; workspace: CaseResolverWorkspace };

export type PersistCaseResolverWorkspaceSuccess = {
  ok: true;
  workspace: CaseResolverWorkspace;
  idempotent: boolean;
};

export type PersistCaseResolverWorkspaceConflict = {
  ok: false;
  conflict: true;
  workspace: CaseResolverWorkspace;
  expectedRevision: number;
  currentRevision: number;
};

export type PersistCaseResolverWorkspaceFailure = {
  ok: false;
  conflict: false;
  error: string;
};

export type PersistCaseResolverWorkspaceResult =
  | PersistCaseResolverWorkspaceSuccess
  | PersistCaseResolverWorkspaceConflict
  | PersistCaseResolverWorkspaceFailure;

/**
 * Case Resolver Context DTOs
 */
export const caseResolverEditorNodeContextSchema = z.object({
  workspaceId: z.string(),
  fileId: z.string(),
  nodeId: z.string().nullable(),
  mode: documentEditorModeSchema,
});

export type CaseResolverEditorNodeContext = z.infer<typeof caseResolverEditorNodeContextSchema>;

export const caseResolverCanvasEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  data: caseResolverEdgeMetaSchema.optional(),
});

export type CaseResolverCanvasEdge = z.infer<typeof caseResolverCanvasEdgeSchema>;

/**
 * Case Resolver Settings DTOs
 */
export const caseResolverSettingsSchema = z.object({
  ocrModel: z.string(),
  ocrPrompt: z.string(),
  defaultDocumentFormat: caseResolverDefaultDocumentFormatSchema,
  confirmDeleteDocument: z.boolean(),
  defaultAddresserPartyKind: z.enum(['person', 'organization']),
  defaultAddresseePartyKind: z.enum(['person', 'organization']),
});

export interface CaseResolverSettings {
  ocrModel: string;
  ocrPrompt: string;
  defaultDocumentFormat: CaseResolverDefaultDocumentFormat;
  confirmDeleteDocument: boolean;
  defaultAddresserPartyKind: 'person' | 'organization';
  defaultAddresseePartyKind: 'person' | 'organization';
}
