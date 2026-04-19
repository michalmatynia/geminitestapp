import { type z } from 'zod';

import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';
import { createProductDraftSchema } from '@/shared/contracts/products/drafts';
import { getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils/json';
import { isObjectRecord, removeUndefined } from '@/shared/utils/object-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS = [
  'name_en',
  'description_en',
  'price',
  'sku',
  'ean',
  'supplierLink',
  'catalogIds',
  'categoryId',
  'shippingGroupId',
  'tagIds',
  'producerIds',
  'imageLinks',
] as const;

export const PLAYWRIGHT_DRAFT_MAPPER_TRANSFORMS = [
  'none',
  'trim',
  'number',
  'string_array',
  'first_non_empty',
] as const;

export type PlaywrightDraftMapperTargetPath =
  (typeof PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS)[number];

export type PlaywrightDraftMapperMode = 'scraped' | 'static';
export type PlaywrightDraftMapperTransform =
  (typeof PLAYWRIGHT_DRAFT_MAPPER_TRANSFORMS)[number];

export type PlaywrightDraftMapperRow = {
  id: string;
  enabled: boolean;
  targetPath: PlaywrightDraftMapperTargetPath;
  mode: PlaywrightDraftMapperMode;
  sourcePath: string;
  staticValue: string;
  transform: PlaywrightDraftMapperTransform;
  required: boolean;
};

export type PlaywrightDraftMapperDiagnosticCode =
  | 'missing_source'
  | 'empty_required_value'
  | 'invalid_number'
  | 'invalid_string_array'
  | 'duplicate_target_path'
  | 'draft_schema_error';

export type PlaywrightDraftMapperDiagnostic = {
  level: 'error' | 'warning';
  code: PlaywrightDraftMapperDiagnosticCode;
  rowId: string | null;
  targetPath: PlaywrightDraftMapperTargetPath | null;
  message: string;
};

export type PlaywrightDraftMapperResolvedField = {
  rowId: string;
  targetPath: PlaywrightDraftMapperTargetPath;
  mode: PlaywrightDraftMapperMode;
  sourcePath: string | null;
  rawValue: unknown;
  resolvedValue: unknown;
};

export type PlaywrightDraftMapperPreview = {
  draftInput: Record<string, unknown>;
  diagnostics: PlaywrightDraftMapperDiagnostic[];
  resolvedFields: PlaywrightDraftMapperResolvedField[];
  valid: boolean;
};

const PLAYWRIGHT_DRAFT_TARGETS = new Set<string>(PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS);
const PLAYWRIGHT_DRAFT_TRANSFORMS = new Set<string>(PLAYWRIGHT_DRAFT_MAPPER_TRANSFORMS);

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `draft-mapper-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeDraftMapperTargetPath = (
  value: unknown
): PlaywrightDraftMapperTargetPath | null => {
  const nextValue = toTrimmedString(value);
  return PLAYWRIGHT_DRAFT_TARGETS.has(nextValue)
    ? (nextValue as PlaywrightDraftMapperTargetPath)
    : null;
};

const normalizeDraftMapperTransform = (value: unknown): PlaywrightDraftMapperTransform => {
  const nextValue = toTrimmedString(value);
  return PLAYWRIGHT_DRAFT_TRANSFORMS.has(nextValue)
    ? (nextValue as PlaywrightDraftMapperTransform)
    : 'none';
};

const isEmptyDraftMapperValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const normalizeStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (
          isObjectRecord(item) &&
          typeof item['url'] === 'string' &&
          item['url'].trim().length > 0
        ) {
          return item['url'].trim();
        }
        return '';
      })
      .filter((item) => item.length > 0);

    return items.length > 0 ? items : [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return normalizeStringArray(parsed);
      }
    } catch {
      // Fall through to plain string parsing.
    }

    return trimmed
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (
    isObjectRecord(value) &&
    typeof value['url'] === 'string' &&
    value['url'].trim().length > 0
  ) {
    return [value['url'].trim()];
  }

  return null;
};

const buildDiagnostic = ({
  code,
  level,
  message,
  row,
}: {
  code: PlaywrightDraftMapperDiagnosticCode;
  level: 'error' | 'warning';
  message: string;
  row?: Pick<PlaywrightDraftMapperRow, 'id' | 'targetPath'> | null;
}): PlaywrightDraftMapperDiagnostic => ({
  code,
  level,
  message,
  rowId: row?.id ?? null,
  targetPath: row?.targetPath ?? null,
});

const normalizeDraftMapperRow = (value: unknown): PlaywrightDraftMapperRow | null => {
  if (!isObjectRecord(value)) return null;

  const targetPath = normalizeDraftMapperTargetPath(value['targetPath']);
  if (targetPath === null) {
    return null;
  }

  const mode: PlaywrightDraftMapperMode = value['mode'] === 'static' ? 'static' : 'scraped';
  return {
    id: typeof value['id'] === 'string' && value['id'].trim().length > 0 ? value['id'] : createRowId(),
    enabled: typeof value['enabled'] === 'boolean' ? value['enabled'] : true,
    targetPath,
    mode,
    sourcePath: toTrimmedString(value['sourcePath']),
    staticValue: typeof value['staticValue'] === 'string' ? value['staticValue'] : '',
    transform: normalizeDraftMapperTransform(value['transform']),
    required: typeof value['required'] === 'boolean' ? value['required'] : false,
  };
};

export const createEmptyPlaywrightDraftMapperRow = (): PlaywrightDraftMapperRow => ({
  id: createRowId(),
  enabled: true,
  targetPath: PLAYWRIGHT_DRAFT_MAPPER_TARGET_PATHS[0],
  mode: 'scraped',
  sourcePath: '',
  staticValue: '',
  transform: 'trim',
  required: false,
});

export const parsePlaywrightDraftMapperJson = (
  rawValue: string | null | undefined
): PlaywrightDraftMapperRow[] => {
  if (!rawValue?.trim()) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => normalizeDraftMapperRow(entry))
      .filter((entry): entry is PlaywrightDraftMapperRow => entry !== null);
  } catch (error) {
    logClientError(error);
    return [];
  }
};

export const serializePlaywrightDraftMapperRows = (
  rows: PlaywrightDraftMapperRow[]
): string | null => {
  const filtered = rows
    .map((row) => ({
      enabled: row.enabled,
      targetPath: row.targetPath,
      mode: row.mode,
      sourcePath: row.sourcePath.trim(),
      staticValue: row.staticValue,
      transform: row.transform,
      required: row.required,
    }))
    .filter((row) => row.enabled && row.targetPath.length > 0)
    .map((row) =>
      row.mode === 'scraped'
        ? row
        : {
            ...row,
            sourcePath: '',
          }
    );

  return filtered.length > 0 ? JSON.stringify(filtered) : null;
};

const resolveFirstNonEmptyScrapedValue = (
  rawProduct: Record<string, unknown>,
  sourcePath: string
): unknown => {
  const paths = sourcePath
    .split('|')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const path of paths) {
    const nextValue = getValueAtMappingPath(rawProduct, path);
    if (!isEmptyDraftMapperValue(nextValue)) {
      return nextValue;
    }
  }

  return undefined;
};

const extractRawDraftMapperValue = (
  rawProduct: Record<string, unknown>,
  row: PlaywrightDraftMapperRow
): unknown => {
  if (row.mode === 'static') {
    return row.staticValue;
  }

  if (row.transform === 'first_non_empty') {
    return resolveFirstNonEmptyScrapedValue(rawProduct, row.sourcePath);
  }

  return getValueAtMappingPath(rawProduct, row.sourcePath);
};

const applyDraftMapperTransform = ({
  rawValue,
  row,
}: {
  rawValue: unknown;
  row: PlaywrightDraftMapperRow;
}): { diagnostics: PlaywrightDraftMapperDiagnostic[]; resolvedValue: unknown } => {
  if (row.transform === 'first_non_empty') {
    return {
      diagnostics: [],
      resolvedValue:
        typeof rawValue === 'string' && rawValue.trim().length === 0 ? null : rawValue,
    };
  }

  if (row.transform === 'trim') {
    if (typeof rawValue !== 'string') {
      return { diagnostics: [], resolvedValue: rawValue };
    }

    const trimmed = rawValue.trim();
    return {
      diagnostics: [],
      resolvedValue: trimmed.length > 0 ? trimmed : null,
    };
  }

  if (row.transform === 'number') {
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return { diagnostics: [], resolvedValue: rawValue };
    }

    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim().replace(/,/g, '.');
      if (normalized.length === 0) {
        return { diagnostics: [], resolvedValue: null };
      }
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        return { diagnostics: [], resolvedValue: parsed };
      }
    }

    return {
      diagnostics: [
        buildDiagnostic({
          code: 'invalid_number',
          level: 'error',
          message: `Field "${row.targetPath}" could not be parsed as number.`,
          row,
        }),
      ],
      resolvedValue: undefined,
    };
  }

  if (row.transform === 'string_array') {
    const normalized = normalizeStringArray(rawValue);
    if (normalized !== null) {
      return { diagnostics: [], resolvedValue: normalized };
    }

    return {
      diagnostics: [
        buildDiagnostic({
          code: 'invalid_string_array',
          level: 'error',
          message: `Field "${row.targetPath}" could not be parsed as string array.`,
          row,
        }),
      ],
      resolvedValue: undefined,
    };
  }

  if (typeof rawValue === 'string' && rawValue.trim().length === 0) {
    return { diagnostics: [], resolvedValue: null };
  }

  return { diagnostics: [], resolvedValue: rawValue };
};

const buildDraftSchemaDiagnostics = (
  issues: z.ZodIssue[]
): PlaywrightDraftMapperDiagnostic[] =>
  issues.map((issue) => {
    const targetPath =
      typeof issue.path[0] === 'string'
        ? normalizeDraftMapperTargetPath(issue.path[0])
        : null;

    return buildDiagnostic({
      code: 'draft_schema_error',
      level: 'error',
      message:
        targetPath !== null
          ? `Draft field "${targetPath}" has invalid value shape: ${issue.message}`
          : issue.message,
      row: targetPath !== null ? { id: '', targetPath } : null,
    });
  });

const validateDraftPreview = (patch: Record<string, unknown>): PlaywrightDraftMapperDiagnostic[] => {
  const result = createProductDraftSchema.safeParse(patch);
  return result.success ? [] : buildDraftSchemaDiagnostics(result.error.issues);
};

const withDraftSchemaFallbacks = (patch: Record<string, unknown>): Record<string, unknown> => {
  const fallbackName =
    typeof patch['name_en'] === 'string' && patch['name_en'].trim().length > 0
      ? patch['name_en']
      : undefined;
  const fallbackDescription =
    typeof patch['description_en'] === 'string' && patch['description_en'].trim().length > 0
      ? patch['description_en']
      : undefined;

  return removeUndefined({
    ...patch,
    name: typeof patch['name'] === 'string' ? patch['name'] : fallbackName,
    description:
      typeof patch['description'] === 'string' ? patch['description'] : fallbackDescription,
  }) as Record<string, unknown>;
};

export const mapScrapedProductToDraftPreview = (
  rawProduct: Record<string, unknown> | null,
  rows: PlaywrightDraftMapperRow[]
): PlaywrightDraftMapperPreview => {
  const diagnostics: PlaywrightDraftMapperDiagnostic[] = [];
  const resolvedFields: PlaywrightDraftMapperResolvedField[] = [];
  const patch: Record<string, unknown> = {};
  const enabledRows = rows.filter((row) => row.enabled);
  const duplicateTargets = new Set<PlaywrightDraftMapperTargetPath>();
  const seenTargets = new Set<PlaywrightDraftMapperTargetPath>();

  for (const row of enabledRows) {
    if (seenTargets.has(row.targetPath)) {
      duplicateTargets.add(row.targetPath);
    }
    seenTargets.add(row.targetPath);
  }

  for (const row of enabledRows) {
    if (duplicateTargets.has(row.targetPath)) {
      diagnostics.push(
        buildDiagnostic({
          code: 'duplicate_target_path',
          level: 'warning',
          message: `Multiple rows target "${row.targetPath}". The last enabled row wins.`,
          row,
        })
      );
    }

    const rawValue =
      row.mode === 'static'
        ? row.staticValue
        : rawProduct !== null
          ? extractRawDraftMapperValue(rawProduct, row)
          : undefined;

    if (row.mode === 'scraped' && (rawProduct === null || row.sourcePath.trim().length === 0 || rawValue === undefined)) {
      diagnostics.push(
        buildDiagnostic({
          code: 'missing_source',
          level: row.required ? 'error' : 'warning',
          message:
            row.sourcePath.trim().length > 0
              ? `Missing scraped value for source path "${row.sourcePath}".`
              : `Add a scraped source path for "${row.targetPath}".`,
          row,
        })
      );
    }

    const transformResult = applyDraftMapperTransform({ rawValue, row });
    diagnostics.push(...transformResult.diagnostics);

    if (row.required && isEmptyDraftMapperValue(transformResult.resolvedValue)) {
      diagnostics.push(
        buildDiagnostic({
          code: 'empty_required_value',
          level: 'error',
          message: `Required field "${row.targetPath}" resolved to an empty value.`,
          row,
        })
      );
    }

    if (!isEmptyDraftMapperValue(transformResult.resolvedValue)) {
      patch[row.targetPath] = transformResult.resolvedValue;
    }

    resolvedFields.push({
      rowId: row.id,
      targetPath: row.targetPath,
      mode: row.mode,
      sourcePath: row.mode === 'scraped' ? row.sourcePath : null,
      rawValue,
      resolvedValue: transformResult.resolvedValue,
    });
  }

  const draftInput = withDraftSchemaFallbacks(patch);
  diagnostics.push(...validateDraftPreview(draftInput));
  const valid = diagnostics.every((diagnostic) => diagnostic.level !== 'error');

  return {
    draftInput,
    diagnostics,
    resolvedFields,
    valid,
  };
};

export const toDraftMapperPreviewInput = (
  value: unknown
): Record<string, unknown> | null => (isObjectRecord(value) ? value : null);

export type { CreateProductDraftInput };
