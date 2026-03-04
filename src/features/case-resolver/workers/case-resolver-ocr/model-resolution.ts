import { detectCaseResolverOcrProvider } from '@/features/case-resolver/ocr-provider';
import type { CaseResolverOcrProvider } from '@/shared/contracts/case-resolver';
import type { CaseResolverResolvedOcrModel } from './types';

export const parseProviderPrefixedModel = (value: string): CaseResolverResolvedOcrModel | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(openai|anthropic|gemini|ollama)\s*[:/]\s*(.+)$/i);
  if (!match) return null;

  const providerRaw = match[1]?.toLowerCase();
  const modelRaw = match[2]?.trim() ?? '';
  if (!providerRaw || !modelRaw) return null;

  if (
    providerRaw !== 'openai' &&
    providerRaw !== 'anthropic' &&
    providerRaw !== 'gemini' &&
    providerRaw !== 'ollama'
  ) {
    return null;
  }

  return {
    provider: providerRaw as CaseResolverOcrProvider,
    model: modelRaw,
  };
};

export const inferCaseResolverOcrProviderFromModel = (modelName: string): CaseResolverOcrProvider =>
  detectCaseResolverOcrProvider(modelName);

export const resolveCaseResolverOcrModel = (
  model: string,
  fallbackModel: string = ''
): CaseResolverResolvedOcrModel => {
  const runtimeModel = model.trim();
  const selectedModel = runtimeModel || fallbackModel.trim();
  if (!selectedModel) {
    throw new Error('OCR model is not configured.');
  }
  const explicitModel = parseProviderPrefixedModel(selectedModel);
  if (explicitModel) return explicitModel;
  return {
    model: selectedModel,
    provider: inferCaseResolverOcrProviderFromModel(selectedModel),
  };
};

export const resolveCaseResolverOcrModelCandidates = (
  model: string,
  fallbackModel: string = ''
): CaseResolverResolvedOcrModel[] => {
  const runtimeCandidates = model
    .split(/[\n,;]+/)
    .map((entry: string): string => entry.trim())
    .filter(Boolean);
  const fallbackCandidate = fallbackModel.trim();
  const candidateValues =
    runtimeCandidates.length > 0 ? runtimeCandidates : fallbackCandidate ? [fallbackCandidate] : [];

  if (candidateValues.length === 0) {
    throw new Error('OCR model is not configured.');
  }

  const uniqueCandidates = new Set<string>();
  const resolvedCandidates: CaseResolverResolvedOcrModel[] = [];

  for (const entry of candidateValues) {
    const normalizedEntry = entry.toLowerCase();
    if (uniqueCandidates.has(normalizedEntry)) continue;
    uniqueCandidates.add(normalizedEntry);
    resolvedCandidates.push(resolveCaseResolverOcrModel(entry));
  }

  return resolvedCandidates;
};
