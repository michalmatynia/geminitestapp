import 'server-only';

import { type z } from 'zod';
import {
  DOCS_MANIFEST_PATH,
  BUILTIN_FALLBACK_MANIFEST,
} from '../docs-registry-adapter.constants';
import { readDocsSourceText } from '../docs-registry-adapter.file-access';
import {
  uniqueStringList,
} from '../docs-registry-adapter.helpers';
import {
  docsManifestSchema,
  type docsManifestSourceSchema,
  type AiPathsDocsManifest,
  type AiPathsDocsManifestSource,
} from '../docs-registry-adapter.types';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export const normalizeManifestSource = (
  source: z.infer<typeof docsManifestSourceSchema>
): AiPathsDocsManifestSource => ({
  id: source.id.trim(),
  type: source.type,
  path: source.path.trim(),
  enabled: source.enabled !== false,
  priority:
    typeof source.priority === 'number' && Number.isFinite(source.priority)
      ? Math.max(0, Math.trunc(source.priority))
      : 100,
  tags: uniqueStringList(source.tags ?? []),
  ...(source.snippetNames?.length ? { snippetNames: uniqueStringList(source.snippetNames) } : {}),
});

export const normalizeManifest = (
  raw: z.infer<typeof docsManifestSchema>,
  warnings: string[]
): AiPathsDocsManifest => {
  const seenIds = new Set<string>();
  const sources: AiPathsDocsManifestSource[] = [];
  raw.sources.forEach((source) => {
    const normalized = normalizeManifestSource(source);
    if (seenIds.has(normalized.id)) {
      warnings.push(
        `Manifest source id "${normalized.id}" is duplicated and later entries are ignored.`
      );
      return;
    }
    seenIds.add(normalized.id);
    sources.push(normalized);
  });
  return {
    version: raw.version?.trim() || '1.0.0',
    sources,
  };
};

export const readAiPathsDocsManifest = async (warnings: string[]): Promise<AiPathsDocsManifest> => {
  try {
    const manifestText = await readDocsSourceText(DOCS_MANIFEST_PATH);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(manifestText);
    } catch (error) {
      void ErrorSystem.captureException(error);
      warnings.push(`${DOCS_MANIFEST_PATH}: invalid JSON. Falling back to built-in sources.`);
      return BUILTIN_FALLBACK_MANIFEST;
    }
    const result = docsManifestSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: schema validation failed. Falling back to built-in sources.`
      );
      return BUILTIN_FALLBACK_MANIFEST;
    }
    const normalized = normalizeManifest(result.data, warnings);
    if (normalized.sources.length === 0) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: no valid sources enabled. Falling back to built-in sources.`
      );
      return BUILTIN_FALLBACK_MANIFEST;
    }
    return normalized;
  } catch (error) {
    void ErrorSystem.captureException(error);
    warnings.push(
      `${DOCS_MANIFEST_PATH}: failed to read manifest (${error instanceof Error ? error.message : 'unknown error'}). Falling back to built-in sources.`
    );
    return BUILTIN_FALLBACK_MANIFEST;
  }
};
