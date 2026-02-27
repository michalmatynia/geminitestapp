import 'server-only';

import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import type { BrainModelsResponse } from '@/shared/contracts/ai-brain';

import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  parseBrainProviderCatalog,
} from './settings';

const OLLAMA_BASE_URL =
  process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODELS_TIMEOUT_MS = 2_500;

const normalizeUnique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  values.forEach((value: string): void => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    output.push(normalized);
  });
  return output;
};

const fetchLiveOllamaModels = async (): Promise<string[] | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    OLLAMA_MODELS_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      models?: Array<{ name?: string | null }>;
    };
    return normalizeUnique(
      (payload.models ?? [])
        .map((model: { name?: string | null }): string =>
          typeof model.name === 'string' ? model.name : '',
        )
        .filter(Boolean),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const listBrainModels = async (): Promise<BrainModelsResponse> => {
  const providerCatalogRaw = await getSettingValue(AI_BRAIN_PROVIDER_CATALOG_KEY);
  const providerCatalog = parseBrainProviderCatalog(providerCatalogRaw);
  const liveOllamaModels = await fetchLiveOllamaModels();

  const modelPresets = normalizeUnique(providerCatalog.modelPresets ?? []);
  const paidModels = normalizeUnique(providerCatalog.paidModels ?? []);
  const configuredOllamaModels = normalizeUnique(
    providerCatalog.ollamaModels ?? [],
  );
  const liveModels = normalizeUnique(liveOllamaModels ?? []);

  const models = normalizeUnique([
    ...modelPresets,
    ...paidModels,
    ...configuredOllamaModels,
    ...liveModels,
  ]);

  const warning =
    liveOllamaModels === null
      ? {
        code: 'OLLAMA_UNAVAILABLE',
        message:
          'Live Ollama discovery failed. Showing Brain-configured model catalog only.',
      }
      : undefined;

  return {
    models,
    ...(warning ? { warning } : {}),
    sources: {
      modelPresets,
      paidModels,
      configuredOllamaModels,
      liveOllamaModels: liveModels,
    },
  };
};
