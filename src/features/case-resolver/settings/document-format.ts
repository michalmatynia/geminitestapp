import { type CaseResolverDefaultDocumentFormat } from '@/shared/contracts/case-resolver';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { normalizeCaseResolverDefaultDocumentFormatValue } from '../settings.helpers';

const readParsedDefaultDocumentFormatCandidates = (parsed: unknown): unknown[] => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [parsed];
  }
  const record = parsed as Record<string, unknown>;
  return [parsed, record['defaultDocumentFormat'], record['editorType']];
};

const resolveParsedDefaultDocumentFormat = (
  parsed: unknown
): CaseResolverDefaultDocumentFormat | null => {
  for (const candidate of readParsedDefaultDocumentFormatCandidates(parsed)) {
    const normalized = normalizeCaseResolverDefaultDocumentFormatValue(candidate);
    if (normalized) return normalized;
  }
  return null;
};

export const parseCaseResolverDefaultDocumentFormat = (
  raw: string | null | undefined,
  fallback: CaseResolverDefaultDocumentFormat = 'wysiwyg'
): CaseResolverDefaultDocumentFormat => {
  const direct = normalizeCaseResolverDefaultDocumentFormatValue(raw);
  if (direct) return direct;

  if (typeof raw !== 'string') return fallback;

  const parsedFormat = resolveParsedDefaultDocumentFormat(parseJsonSetting<unknown>(raw, null));
  if (parsedFormat) return parsedFormat;

  return fallback;
};
