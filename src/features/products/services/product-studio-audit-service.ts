import 'server-only';

import { randomUUID } from 'crypto';

import type { ImageStudioRunDispatchMode } from '@/shared/contracts/image-studio';
import type {
  ProductStudioExecutionRoute,
  ProductStudioSequenceGenerationMode,
  ProductStudioSequencingDiagnosticsScope,
} from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Collection } from 'mongodb';


export type ProductStudioRunAuditStatus = 'completed' | 'failed';

export type ProductStudioRunAuditTimings = {
  importMs: number | null;
  sourceSlotUpsertMs: number | null;
  routeDecisionMs: number | null;
  dispatchMs: number | null;
  totalMs: number;
};

export type ProductStudioRunAuditEntry = {
  id: string;
  productId: string;
  imageSlotIndex: number;
  projectId: string;
  createdAt: string;
  status: ProductStudioRunAuditStatus;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  runKind: 'generation' | 'sequence';
  runId: string | null;
  sequenceRunId: string | null;
  dispatchMode: ImageStudioRunDispatchMode | null;
  fallbackReason: string | null;
  warnings: string[];
  settingsScope: ProductStudioSequencingDiagnosticsScope;
  settingsKey: string | null;
  projectSettingsKey: string | null;
  settingsScopeValid: boolean;
  sequenceSnapshotHash: string | null;
  stepOrderUsed: string[];
  resolvedCropRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  sourceImageSize: {
    width: number;
    height: number;
  } | null;
  timings: ProductStudioRunAuditTimings;
  errorMessage: string | null;
};

type ProductStudioRunAuditDocument = ProductStudioRunAuditEntry & {
  _id?: string;
};

type CreateProductStudioRunAuditInput = Omit<ProductStudioRunAuditEntry, 'id' | 'createdAt'> & {
  createdAt?: string | null;
};

const COLLECTION_NAME = 'product_studio_run_audit';
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const normalizeWarnings = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => asTrimmedString(entry))
    .filter(Boolean);
};

const normalizeStepOrderUsed = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => asTrimmedString(entry))
    .filter(Boolean)
    .slice(0, 50);
};

const normalizeCropRect = (
  input: unknown,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const x = toFiniteNumber(record['x']);
  const y = toFiniteNumber(record['y']);
  const width = toFiniteNumber(record['width']);
  const height = toFiniteNumber(record['height']);
  if (x === null || y === null || width === null || height === null) return null;
  return {
    x: Math.max(0, Math.min(1, Number(x.toFixed(6)))),
    y: Math.max(0, Math.min(1, Number(y.toFixed(6)))),
    width: Math.max(0, Math.min(1, Number(width.toFixed(6)))),
    height: Math.max(0, Math.min(1, Number(height.toFixed(6)))),
  };
};

const normalizeSourceImageSize = (
  input: unknown,
): { width: number; height: number } | null => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const width = toFiniteNumber(record['width']);
  const height = toFiniteNumber(record['height']);
  if (width === null || height === null) return null;
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
};

const toAuditEntry = (doc: ProductStudioRunAuditDocument): ProductStudioRunAuditEntry | null => {
  const id = asTrimmedString(doc.id || doc._id);
  const productId = asTrimmedString(doc.productId);
  const projectId = asTrimmedString(doc.projectId);
  const requestedSequenceMode = asTrimmedString(doc.requestedSequenceMode);
  const resolvedSequenceMode = asTrimmedString(doc.resolvedSequenceMode);
  const executionRoute = asTrimmedString(doc.executionRoute);
  const runKind = asTrimmedString(doc.runKind);
  const status = asTrimmedString(doc.status);
  if (!id || !productId || !projectId) return null;
  if (
    requestedSequenceMode !== 'auto' &&
    requestedSequenceMode !== 'studio_prompt_then_sequence' &&
    requestedSequenceMode !== 'model_full_sequence' &&
    requestedSequenceMode !== 'studio_native_sequencer_prior_generation'
  ) {
    return null;
  }
  if (
    resolvedSequenceMode !== 'auto' &&
    resolvedSequenceMode !== 'studio_prompt_then_sequence' &&
    resolvedSequenceMode !== 'model_full_sequence' &&
    resolvedSequenceMode !== 'studio_native_sequencer_prior_generation'
  ) {
    return null;
  }
  if (
    executionRoute !== 'studio_sequencer' &&
    executionRoute !== 'studio_native_sequencer_prior_generation' &&
    executionRoute !== 'ai_model_full_sequence' &&
    executionRoute !== 'ai_direct_generation'
  ) {
    return null;
  }
  if (runKind !== 'generation' && runKind !== 'sequence') return null;
  if (status !== 'completed' && status !== 'failed') return null;

  const imageSlotIndex = Number.isFinite(doc.imageSlotIndex)
    ? Math.max(0, Math.floor(doc.imageSlotIndex))
    : 0;
  const createdAt = asTrimmedString(doc.createdAt) || new Date().toISOString();
  const runId = asTrimmedString(doc.runId) || null;
  const sequenceRunId = asTrimmedString(doc.sequenceRunId) || null;
  const dispatchModeRaw = asTrimmedString(doc.dispatchMode);
  const dispatchMode =
    dispatchModeRaw === 'queued' || dispatchModeRaw === 'inline' ? dispatchModeRaw : null;
  const fallbackReason = asTrimmedString(doc.fallbackReason) || null;
  const errorMessage = asTrimmedString(doc.errorMessage) || null;
  const warnings = normalizeWarnings(doc.warnings);
  const settingsScopeRaw = asTrimmedString(doc.settingsScope);
  const settingsScope: ProductStudioSequencingDiagnosticsScope =
    settingsScopeRaw === 'project' ||
    settingsScopeRaw === 'global' ||
    settingsScopeRaw === 'default'
      ? settingsScopeRaw
      : 'default';
  const settingsKey = asTrimmedString(doc.settingsKey) || null;
  const projectSettingsKey = asTrimmedString(doc.projectSettingsKey) || null;
  const settingsScopeValid =
    typeof doc.settingsScopeValid === 'boolean'
      ? doc.settingsScopeValid
      : settingsScope === 'project';
  const sequenceSnapshotHash = asTrimmedString(doc.sequenceSnapshotHash) || null;
  const stepOrderUsed = normalizeStepOrderUsed(doc.stepOrderUsed);
  const resolvedCropRect = normalizeCropRect(doc.resolvedCropRect);
  const sourceImageSize = normalizeSourceImageSize(doc.sourceImageSize);
  const timingsRecord =
    doc.timings && typeof doc.timings === 'object' && !Array.isArray(doc.timings)
      ? (doc.timings as Record<string, unknown>)
      : {};

  const totalMs = Math.max(0, Math.floor(toFiniteNumber(timingsRecord['totalMs']) ?? 0));
  const normalizeStage = (key: keyof ProductStudioRunAuditTimings): number | null => {
    if (key === 'totalMs') return totalMs;
    const value = toFiniteNumber(timingsRecord[key]);
    if (value === null) return null;
    return Math.max(0, Math.floor(value));
  };

  return {
    id,
    productId,
    imageSlotIndex,
    projectId,
    createdAt,
    status,
    requestedSequenceMode,
    resolvedSequenceMode,
    executionRoute,
    runKind,
    runId,
    sequenceRunId,
    dispatchMode,
    fallbackReason,
    warnings,
    settingsScope,
    settingsKey,
    projectSettingsKey,
    settingsScopeValid,
    sequenceSnapshotHash,
    stepOrderUsed,
    resolvedCropRect,
    sourceImageSize,
    timings: {
      importMs: normalizeStage('importMs'),
      sourceSlotUpsertMs: normalizeStage('sourceSlotUpsertMs'),
      routeDecisionMs: normalizeStage('routeDecisionMs'),
      dispatchMs: normalizeStage('dispatchMs'),
      totalMs,
    },
    errorMessage,
  };
};

const getCollection = async (): Promise<Collection<ProductStudioRunAuditDocument> | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const collection = mongo.collection<ProductStudioRunAuditDocument>(COLLECTION_NAME);
  await Promise.allSettled([
    collection.createIndex({ productId: 1, createdAt: -1 }),
    collection.createIndex({ productId: 1, imageSlotIndex: 1, createdAt: -1 }),
  ]);
  return collection;
};

export async function createProductStudioRunAudit(
  input: CreateProductStudioRunAuditInput,
): Promise<void> {
  const productId = asTrimmedString(input.productId);
  const projectId = asTrimmedString(input.projectId);
  if (!productId || !projectId) return;

  const id = randomUUID();
  const createdAt = asTrimmedString(input.createdAt) || new Date().toISOString();
  const warnings = normalizeWarnings(input.warnings);
  const timings = input.timings;
  const document: ProductStudioRunAuditDocument = {
    id,
    productId,
    imageSlotIndex: Math.max(0, Math.floor(input.imageSlotIndex)),
    projectId,
    createdAt,
    status: input.status,
    requestedSequenceMode: input.requestedSequenceMode,
    resolvedSequenceMode: input.resolvedSequenceMode,
    executionRoute: input.executionRoute,
    runKind: input.runKind,
    runId: input.runId ?? null,
    sequenceRunId: input.sequenceRunId ?? null,
    dispatchMode: input.dispatchMode ?? null,
    fallbackReason: asTrimmedString(input.fallbackReason) || null,
    warnings,
    settingsScope:
      input.settingsScope === 'project' ||
      input.settingsScope === 'global' ||
      input.settingsScope === 'default'
        ? input.settingsScope
        : 'default',
    settingsKey: asTrimmedString(input.settingsKey) || null,
    projectSettingsKey: asTrimmedString(input.projectSettingsKey) || null,
    settingsScopeValid:
      typeof input.settingsScopeValid === 'boolean'
        ? input.settingsScopeValid
        : input.settingsScope === 'project',
    sequenceSnapshotHash: asTrimmedString(input.sequenceSnapshotHash) || null,
    stepOrderUsed: normalizeStepOrderUsed(input.stepOrderUsed),
    resolvedCropRect: normalizeCropRect(input.resolvedCropRect),
    sourceImageSize: normalizeSourceImageSize(input.sourceImageSize),
    timings: {
      importMs:
        typeof timings.importMs === 'number' && Number.isFinite(timings.importMs)
          ? Math.max(0, Math.floor(timings.importMs))
          : null,
      sourceSlotUpsertMs:
        typeof timings.sourceSlotUpsertMs === 'number' &&
        Number.isFinite(timings.sourceSlotUpsertMs)
          ? Math.max(0, Math.floor(timings.sourceSlotUpsertMs))
          : null,
      routeDecisionMs:
        typeof timings.routeDecisionMs === 'number' && Number.isFinite(timings.routeDecisionMs)
          ? Math.max(0, Math.floor(timings.routeDecisionMs))
          : null,
      dispatchMs:
        typeof timings.dispatchMs === 'number' && Number.isFinite(timings.dispatchMs)
          ? Math.max(0, Math.floor(timings.dispatchMs))
          : null,
      totalMs: Math.max(0, Math.floor(timings.totalMs)),
    },
    errorMessage: asTrimmedString(input.errorMessage) || null,
  };

  const collection = await getCollection();
  if (!collection) return;
  await collection.insertOne(document);
}

export async function listProductStudioRunAudit(params: {
  productId: string;
  imageSlotIndex?: number | null;
  limit?: number | null;
}): Promise<ProductStudioRunAuditEntry[]> {
  const productId = asTrimmedString(params.productId);
  if (!productId) return [];

  const requestedLimit =
    typeof params.limit === 'number' && Number.isFinite(params.limit)
      ? Math.max(1, Math.floor(params.limit))
      : DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, requestedLimit);
  const query: Record<string, unknown> = { productId };
  if (typeof params.imageSlotIndex === 'number' && Number.isFinite(params.imageSlotIndex)) {
    query['imageSlotIndex'] = Math.max(0, Math.floor(params.imageSlotIndex));
  }

  const collection = await getCollection();
  if (!collection) return [];
  const rows = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows
    .map((row) => toAuditEntry(row))
    .filter((row): row is ProductStudioRunAuditEntry => Boolean(row));
}
