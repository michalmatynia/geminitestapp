import { parsePlaywrightFieldMapperJson } from '@/features/integrations/services/playwright-listing/field-mapper';

import type {
  FieldBinding,
  FieldMap,
  FieldMapTargetField,
  ScripterDefinition,
} from './types';

export type ConnectionImportInput = {
  connectionId: string;
  name: string | null | undefined;
  playwrightImportBaseUrl?: string | null | undefined;
  playwrightFieldMapperJson?: string | null | undefined;
  siteHostHint?: string | null | undefined;
};

export type ConnectionImportResult = {
  definition: ScripterDefinition;
  warnings: string[];
};

const NON_DECOMPOSING_LATIN: Readonly<Record<string, string>> = {
  ł: 'l',
  Ł: 'L',
  đ: 'd',
  Đ: 'D',
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  ß: 'ss',
};

const sanitizeScripterId = (raw: string): string => {
  const mapped = raw.replace(/[ŁłĐđØøÆæŒœß]/g, (ch) => NON_DECOMPOSING_LATIN[ch] ?? ch);
  const trimmed = mapped
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return trimmed.length > 0 ? trimmed : `connection-${Date.now().toString(36)}`;
};

const resolveSiteHost = (entryUrl: string, hint: string | null | undefined): string => {
  if (hint && hint.trim().length > 0) return hint.trim();
  try {
    return new URL(entryUrl).host;
  } catch {
    return 'example.com';
  }
};

const FIELD_MAPPER_TARGET_TO_SCRIPTER: Record<string, FieldMapTargetField> = {
  title: 'title',
  description: 'description',
  price: 'price',
  images: 'images',
  sku: 'sku',
  ean: 'ean',
  sourceUrl: 'sourceUrl',
};

const defaultTransformsFor = (
  field: FieldMapTargetField,
  baseUrl: string | null
): FieldBinding['transforms'] => {
  switch (field) {
    case 'title':
    case 'description':
    case 'sku':
    case 'ean':
      return [{ name: 'trim' }];
    case 'price':
      return [{ name: 'toNumber' }, { name: 'money' }];
    case 'images':
      return [{ name: 'toStringArray' }];
    case 'sourceUrl':
      return baseUrl ? [{ name: 'absoluteUrl', args: { base: baseUrl } }] : [];
    default:
      return undefined;
  }
};

const normalizePath = (sourceKey: string): string => {
  const trimmed = sourceKey.trim();
  if (trimmed.length === 0) return trimmed;
  if (trimmed.startsWith('$')) return trimmed;
  return trimmed;
};

export const importScripterFromConnection = (
  input: ConnectionImportInput
): ConnectionImportResult => {
  const warnings: string[] = [];
  const baseUrl = input.playwrightImportBaseUrl?.trim() || null;
  const entryUrl = baseUrl ?? 'https://example.com/products';
  if (!baseUrl) {
    warnings.push('Connection has no playwrightImportBaseUrl — using a placeholder entry URL.');
  }

  const entries = parsePlaywrightFieldMapperJson(input.playwrightFieldMapperJson ?? null);
  if (entries.length === 0) {
    warnings.push('Connection has no field-mapper entries — the imported scripter has an empty field map.');
  }

  const bindings: Partial<Record<FieldMapTargetField, FieldBinding>> = {};
  const perFieldPaths: Partial<Record<FieldMapTargetField, string[]>> = {};

  for (const entry of entries) {
    const targetField = FIELD_MAPPER_TARGET_TO_SCRIPTER[entry.targetField];
    if (!targetField) {
      warnings.push(`Skipping unsupported target "${entry.targetField}".`);
      continue;
    }
    const path = normalizePath(entry.sourceKey);
    if (path.length === 0) continue;
    const existing = perFieldPaths[targetField] ?? [];
    if (!existing.includes(path)) existing.push(path);
    perFieldPaths[targetField] = existing;
  }

  for (const [field, paths] of Object.entries(perFieldPaths) as Array<
    [FieldMapTargetField, string[]]
  >) {
    const transforms = defaultTransformsFor(field, baseUrl);
    const binding: FieldBinding = paths.length === 1
      ? { path: paths[0]! }
      : { paths };
    if (transforms && transforms.length > 0) binding.transforms = transforms;
    if (field === 'title' || field === 'price') binding.required = true;
    bindings[field] = binding;
  }

  const fieldMap: FieldMap = { bindings };
  const derivedName = (input.name ?? input.connectionId).trim();
  const definition: ScripterDefinition = {
    id: sanitizeScripterId(derivedName),
    version: 1,
    siteHost: resolveSiteHost(entryUrl, input.siteHostHint),
    description: `Imported from connection "${derivedName}" on ${new Date().toISOString().slice(0, 10)}.`,
    entryUrl,
    steps: [
      {
        id: 'open',
        kind: 'goto',
        url: entryUrl,
      },
    ],
    fieldMap,
  };

  return { definition, warnings };
};
