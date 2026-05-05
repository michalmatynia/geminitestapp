import { type CaseResolverSettings } from '@/shared/contracts/case-resolver';
import { DEFAULT_CASE_RESOLVER_SETTINGS } from '../settings.constants';
import { normalizeCaseResolverDefaultDocumentFormatValue } from '../settings.helpers';

export const normalizeCaseResolverSettings = (input: unknown): CaseResolverSettings => {
  if (typeof input === 'string') return DEFAULT_CASE_RESOLVER_SETTINGS;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return DEFAULT_CASE_RESOLVER_SETTINGS;
  }
  const record = input as Record<string, unknown>;
  const ocrModel = typeof record['ocrModel'] === 'string' ? record['ocrModel'].trim() : '';
  const ocrPrompt = typeof record['ocrPrompt'] === 'string' ? record['ocrPrompt'].trim() : '';
  const rawFormatCandidate =
    typeof record['defaultDocumentFormat'] === 'string' ? record['defaultDocumentFormat'] : null;
  const normalizedDefaultDocumentFormat =
    normalizeCaseResolverDefaultDocumentFormatValue(rawFormatCandidate);
  
  return {
    ...DEFAULT_CASE_RESOLVER_SETTINGS,
    ocrModel,
    ocrPrompt,
    defaultDocumentFormat: normalizedDefaultDocumentFormat ?? DEFAULT_CASE_RESOLVER_SETTINGS.defaultDocumentFormat,
  };
};
