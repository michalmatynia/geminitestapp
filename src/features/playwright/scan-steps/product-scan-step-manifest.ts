import type { ProductScanStep } from '@/shared/contracts/product-scans';

import {
  PRODUCT_SCAN_STEP_REGISTRY,
  PRODUCT_SCAN_STEP_SEQUENCES,
  type ProductScanSequenceEntry,
  type ProductScanSequenceKey,
  type ProductScanStepDefinition,
} from './product-scan-step-definitions';

type ProductScanSequenceInput = {
  defaultSequenceKey?: string | null;
  sequenceKey?: string | null;
  customSequence?: readonly ProductScanSequenceEntry[] | null;
};

type ProductScanSequenceEntryRecord = {
  key: string;
  label?: string | null;
  group?: ProductScanStep['group'];
};

const STEP_REGISTRY_BY_KEY: Readonly<Record<string, ProductScanStepDefinition>> =
  PRODUCT_SCAN_STEP_REGISTRY;

const STEP_SEQUENCES_BY_KEY: Readonly<
  Record<string, readonly ProductScanSequenceEntry[]>
> = PRODUCT_SCAN_STEP_SEQUENCES;

const normalizeText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequenceEntry = (
  entry: ProductScanSequenceEntry
): ProductScanSequenceEntryRecord | null => {
  if (typeof entry === 'string') {
    return { key: entry };
  }
  const key = normalizeText(entry.key);
  return key === null ? null : { ...entry, key };
};

export const resolveProductScanStepDefinition = (
  key: string | null | undefined
): ProductScanStepDefinition | null => {
  const normalizedKey = normalizeText(key);
  return normalizedKey === null ? null : STEP_REGISTRY_BY_KEY[normalizedKey] ?? null;
};

export const resolveProductScanStepGroup = (
  key: string | null | undefined
): ProductScanStep['group'] => resolveProductScanStepDefinition(key)?.group ?? null;

const resolveSequenceByKey = (
  key: string | null
): readonly ProductScanSequenceEntry[] | null =>
  key === null ? null : STEP_SEQUENCES_BY_KEY[key as ProductScanSequenceKey] ?? null;

const resolveCustomSequenceEntries = (
  input: ProductScanSequenceInput | undefined
): readonly ProductScanSequenceEntry[] | null => {
  const customSequence = input?.customSequence;
  return Array.isArray(customSequence) && customSequence.length > 0 ? customSequence : null;
};

const resolveSequenceEntries = (
  input?: ProductScanSequenceInput
): readonly ProductScanSequenceEntry[] => {
  const customSequence = resolveCustomSequenceEntries(input);
  if (customSequence !== null) return customSequence;

  const requestedSequence = resolveSequenceByKey(normalizeText(input?.sequenceKey));
  if (requestedSequence !== null) return requestedSequence;

  return resolveSequenceByKey(normalizeText(input?.defaultSequenceKey)) ?? [];
};

const resolveManifestGroup = (
  rawEntry: ProductScanSequenceEntryRecord,
  definition: ProductScanStepDefinition | null
): ProductScanStep['group'] => rawEntry.group ?? definition?.group ?? null;

const resolveManifestLabel = (
  rawEntry: ProductScanSequenceEntryRecord,
  definition: ProductScanStepDefinition | null
): string => normalizeText(rawEntry.label) ?? definition?.label ?? rawEntry.key;

const resolveManifestEntry = (
  entry: ProductScanSequenceEntry
): ProductScanStepDefinition | null => {
  const rawEntry = normalizeSequenceEntry(entry);
  if (rawEntry === null) return null;

  const definition = resolveProductScanStepDefinition(rawEntry.key);
  const group = resolveManifestGroup(rawEntry, definition);
  if (group === null) return null;

  return {
    key: rawEntry.key,
    label: resolveManifestLabel(rawEntry, definition),
    group,
  };
};

export const buildProductScanStepSequenceManifest = (
  input?: ProductScanSequenceInput
): ProductScanStepDefinition[] =>
  resolveSequenceEntries(input)
    .map((entry) => resolveManifestEntry(entry))
    .filter((entry): entry is ProductScanStepDefinition => entry !== null);

export const buildProductScanPendingSteps = (
  input?: ProductScanSequenceInput
): ProductScanStep[] =>
  buildProductScanStepSequenceManifest(input).map((step) => ({
    key: step.key,
    label: step.label,
    group: step.group,
    attempt: null,
    candidateId: null,
    candidateRank: null,
    inputSource: null,
    retryOf: null,
    resultCode: null,
    status: 'pending',
    message: null,
    warning: null,
    details: [],
    url: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  }));
