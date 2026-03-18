import 'server-only';

import type {
  AiBrainProviderCatalog,
  BrainModelDescriptor,
  BrainModelFamily,
  BrainModelModality,
  BrainModelsResponse,
} from '@/shared/contracts/ai-brain';

import { catalogToEntries, entriesToCatalogArrays } from './catalog-entries';
import { resolveOllamaBaseUrl } from './ollama-config';
import { readStoredSettingValue, upsertStoredSettingValue } from './server';
import {
  inferBrainRuntimeVendor,
  normalizeBrainRuntimeModelId,
  supportsBrainJsonMode,
  supportsBrainStreaming,
} from './server-runtime-client';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  defaultBrainProviderCatalog,
  parseBrainProviderCatalog,
  sanitizeBrainProviderCatalog,
  toPersistedBrainProviderCatalog,
} from './settings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const OLLAMA_BASE_URL = resolveOllamaBaseUrl();
const OLLAMA_MODELS_TIMEOUT_MS = 4_500;
const OLLAMA_DISCOVERY_LOG_THROTTLE_MS = 5 * 60 * 1000;
let lastOllamaDiscoveryLogAt = 0;

const shouldLogOllamaDiscoveryFailure = (): boolean => {
  const now = Date.now();
  if (now - lastOllamaDiscoveryLogAt < OLLAMA_DISCOVERY_LOG_THROTTLE_MS) {
    return false;
  }
  lastOllamaDiscoveryLogAt = now;
  return true;
};

type ListBrainModelsOptions = {
  family?: BrainModelFamily;
  modality?: BrainModelModality;
  streaming?: boolean;
};

type CatalogRepairStatus = 'reset' | null;

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

const buildOllamaBaseCandidates = (baseUrl: string): string[] => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return [];

  const candidates: string[] = [trimmed];
  if (trimmed.toLowerCase().endsWith('/v1')) {
    candidates.push(trimmed.replace(/\/v1$/i, ''));
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const localhostUrl = new URL(parsed.toString());
      localhostUrl.hostname = 'localhost';
      const loopbackUrl = new URL(parsed.toString());
      loopbackUrl.hostname = '127.0.0.1';
      const dockerHostUrl = new URL(parsed.toString());
      dockerHostUrl.hostname = 'host.docker.internal';
      candidates.push(
        localhostUrl.toString().replace(/\/+$/, ''),
        loopbackUrl.toString().replace(/\/+$/, ''),
        dockerHostUrl.toString().replace(/\/+$/, '')
      );
    }
  } catch (error) {
    void ErrorSystem.captureException(error);
  
    // Keep only the raw configured value if URL parsing fails.
  }

  return normalizeUnique(candidates);
};

const buildOllamaDiscoveryUrls = (baseUrl: string): string[] => {
  const baseCandidates = buildOllamaBaseCandidates(baseUrl);
  const urls: string[] = [];
  baseCandidates.forEach((candidate: string): void => {
    const normalized = candidate.replace(/\/+$/, '');
    urls.push(`${normalized}/api/tags`);
    urls.push(`${normalized}/v1/models`);
    if (normalized.toLowerCase().endsWith('/v1')) {
      const withoutV1 = normalized.replace(/\/v1$/i, '');
      urls.push(`${withoutV1}/api/tags`);
      urls.push(`${withoutV1}/v1/models`);
    }
  });
  return normalizeUnique(urls);
};

const parseDiscoveredModelIds = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;

  const ollamaModels = Array.isArray(record['models'])
    ? (record['models'] as Array<Record<string, unknown>>)
    : [];
  const fromOllamaTags = ollamaModels.map((model): string => {
    const name = typeof model?.['name'] === 'string' ? model['name'] : '';
    const modelId = typeof model?.['model'] === 'string' ? model['model'] : '';
    return (name || modelId).trim();
  });

  const openAiCompatibleModels = Array.isArray(record['data'])
    ? (record['data'] as Array<Record<string, unknown>>)
    : [];
  const fromOpenAiCompatible = openAiCompatibleModels.map((model): string => {
    const id = typeof model?.['id'] === 'string' ? model['id'] : '';
    return id.trim();
  });

  return normalizeUnique([...fromOllamaTags, ...fromOpenAiCompatible]);
};

const resetProviderCatalog = async (): Promise<{
  catalog: AiBrainProviderCatalog;
  status: CatalogRepairStatus;
}> => {
  const fallback = sanitizeBrainProviderCatalog(defaultBrainProviderCatalog);
  await upsertStoredSettingValue(
    AI_BRAIN_PROVIDER_CATALOG_KEY,
    JSON.stringify(toPersistedBrainProviderCatalog(fallback))
  );
  return { catalog: fallback, status: 'reset' };
};

const fetchModelsFromUrl = async (
  url: string
): Promise<{ models: string[] | null; error?: unknown }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_MODELS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return { models: null };
    const payload = (await response.json()) as unknown;
    return { models: parseDiscoveredModelIds(payload) };
  } catch (error) {
    return { models: null, error };
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchLiveOllamaModels = async (): Promise<string[] | null> => {
  const discoveryUrls = buildOllamaDiscoveryUrls(OLLAMA_BASE_URL);
  let lastFailure: { url: string; error: unknown } | null = null;
  for (const url of discoveryUrls) {
    const result = await fetchModelsFromUrl(url);
    if (result.models !== null) return result.models;
    if (result.error) {
      lastFailure = { url, error: result.error };
    }
  }
  if (lastFailure && shouldLogOllamaDiscoveryFailure()) {
    const cause =
      lastFailure.error instanceof Error
        ? lastFailure.error
        : new Error(String(lastFailure.error ?? 'Unknown error'));
    const error = new Error(`Ollama server unreachable at ${OLLAMA_BASE_URL}.`, {
      cause,
    });
    void ErrorSystem.captureException(error, {
      service: 'ai-brain-model-catalog',
      baseUrl: OLLAMA_BASE_URL,
      url: lastFailure.url,
    });
  }
  return null;
};

const classifyBrainModelFamily = (modelId: string): BrainModelFamily => {
  const normalized = normalizeBrainRuntimeModelId(modelId).toLowerCase();
  if (normalized.includes('embed')) return 'embedding';
  if (
    normalized.includes('gpt-image') ||
    normalized.startsWith('dall-e') ||
    normalized.includes('flux') ||
    normalized.includes('sdxl') ||
    normalized.includes('stable-diffusion')
  ) {
    return 'image_generation';
  }
  if (
    normalized.includes('ocr') ||
    normalized.includes('document') ||
    normalized.includes('docling')
  ) {
    return 'ocr';
  }
  if (
    normalized.includes('vision') ||
    normalized.includes('-vl') ||
    normalized.includes('llava') ||
    normalized.includes('gemma3') ||
    normalized.includes('multimodal')
  ) {
    return 'vision_extract';
  }
  if (
    normalized.includes('validator') ||
    normalized.includes('moderation') ||
    normalized.includes('guard')
  ) {
    return 'validation';
  }
  return 'chat';
};

const modalityByFamily: Record<BrainModelFamily, BrainModelModality> = {
  chat: 'text',
  embedding: 'text',
  validation: 'text',
  image_generation: 'image',
  vision_extract: 'multimodal',
  ocr: 'multimodal',
};

export const describeBrainModel = (modelId: string): BrainModelDescriptor => {
  const family = classifyBrainModelFamily(modelId);
  return {
    id: normalizeBrainRuntimeModelId(modelId),
    family,
    modality: modalityByFamily[family],
    vendor: inferBrainRuntimeVendor(modelId),
    supportsStreaming: supportsBrainStreaming(modelId),
    supportsJsonMode: supportsBrainJsonMode(modelId),
  };
};

export const listBrainModels = async (
  options: ListBrainModelsOptions = {}
): Promise<BrainModelsResponse> => {
  const providerCatalogRaw = await readStoredSettingValue(AI_BRAIN_PROVIDER_CATALOG_KEY);
  let providerCatalog = defaultBrainProviderCatalog;
  let providerCatalogRepairStatus: CatalogRepairStatus = null;

  if (providerCatalogRaw?.trim().length) {
    try {
      providerCatalog = parseBrainProviderCatalog(providerCatalogRaw);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const repaired = await resetProviderCatalog();
      providerCatalog = repaired.catalog;
      providerCatalogRepairStatus = repaired.status;
    }
  }
  const liveOllamaModels = await fetchLiveOllamaModels();
  const catalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));

  const modelPresets = normalizeUnique(catalogArrays.modelPresets);
  const paidModels = normalizeUnique(catalogArrays.paidModels);
  const configuredOllamaModels = normalizeUnique(catalogArrays.ollamaModels);
  const liveModels = normalizeUnique(liveOllamaModels ?? []);

  const combined = normalizeUnique([
    ...modelPresets,
    ...paidModels,
    ...configuredOllamaModels,
    ...liveModels,
  ]);

  const descriptors = Object.fromEntries(
    combined.map((modelId: string): [string, BrainModelDescriptor] => [
      modelId,
      describeBrainModel(modelId),
    ])
  );

  const filteredModels = combined.filter((modelId: string): boolean => {
    const descriptor = descriptors[modelId];
    if (!descriptor) return false;
    if (options.family && descriptor.family !== options.family) return false;
    if (options.modality && descriptor.modality !== options.modality) return false;
    if (
      typeof options.streaming === 'boolean' &&
      descriptor.supportsStreaming !== options.streaming
    ) {
      return false;
    }
    return true;
  });

  const ollamaWarning =
    liveOllamaModels === null
      ? {
        code: 'OLLAMA_UNAVAILABLE',
        message:
            `Live Ollama discovery failed for ${OLLAMA_BASE_URL}. ` +
            'Showing Brain-configured model catalog only. ' +
            'If OLLAMA_BASE_URL includes /v1, set it to the host root (for example http://localhost:11434).',
      }
      : undefined;
  const catalogRepairWarning =
    providerCatalogRepairStatus === 'reset'
      ? {
        code: 'PROVIDER_CATALOG_RESET',
        message:
            'AI Brain provider catalog payload was invalid and has been reset to canonical defaults.',
      }
      : undefined;
  const warning =
    catalogRepairWarning && ollamaWarning
      ? {
        code: `${catalogRepairWarning.code}+${ollamaWarning.code}`,
        message: `${catalogRepairWarning.message} ${ollamaWarning.message}`,
      }
      : (catalogRepairWarning ?? ollamaWarning);

  return {
    models: filteredModels,
    descriptors: Object.fromEntries(
      filteredModels.map((modelId: string): [string, BrainModelDescriptor] => [
        modelId,
        descriptors[modelId]!,
      ])
    ),
    ...(warning ? { warning } : {}),
    sources: {
      modelPresets,
      paidModels,
      configuredOllamaModels,
      liveOllamaModels: liveModels,
    },
  };
};
