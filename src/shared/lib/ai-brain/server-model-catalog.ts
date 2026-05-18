/**
 * AI Brain Server Model Catalog
 * 
 * Central registry and discovery service for all AI models available to the platform.
 * 
 * The catalog acts as the single source of truth for model availability, routing,
 * and capability metadata. It abstracts vendor-specific configurations (OpenAI, 
 * Anthropic, Ollama, etc.) into a unified internal descriptor format.
 * 
 * Key Responsibilities:
 * - Discovery: Fetches and catalogs local Ollama models and retrieves remote presets.
 * - Resolution: Maps stored environment configurations and platform-wide settings to 
 *   runnable model descriptors.
 * - Classification: Groups models by modality (text, image, embedding) and family 
 *   (GPT-4, Claude, Llama) to facilitate intelligent routing.
 * - Metadata Management: Enforces capabilities like streaming, JSON mode support, and 
 *   vendor-specific runtime normalization.
 * 
 * Usage:
 * Use this catalog in AI services to resolve which model to use based on the 
 * requested task modality and the platform's current availability/configuration.
 */
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

/**
 * Matchers for classifying models into families based on their IDs.
 */
const MODEL_FAMILY_MATCHERS: ReadonlyArray<{
  family: BrainModelFamily;
  matches: readonly string[];
  startsWith?: readonly string[];
}> = [
  {
    family: 'embedding',
    matches: ['embed'],
  },
  {
    family: 'image_generation',
    matches: ['gpt-image', 'flux', 'sdxl', 'stable-diffusion'],
    startsWith: ['dall-e'],
  },
  {
    family: 'ocr',
    matches: ['ocr', 'document', 'docling'],
  },
  {
    family: 'vision_extract',
    matches: ['vision', '-vl', 'llava', 'gemma3', 'gemma-3', 'gemma4', 'gemma-4', 'multimodal'],
  },
  {
    family: 'validation',
    matches: ['validator', 'moderation', 'guard'],
  },
] as const;

/**
 * Throttles logging of Ollama discovery failures to avoid log spamming.
 * 
 * @returns True if the failure should be logged.
 */
const shouldLogOllamaDiscoveryFailure = (): boolean => {
  const now = Date.now();
  if (now - lastOllamaDiscoveryLogAt < OLLAMA_DISCOVERY_LOG_THROTTLE_MS) {
    return false;
  }
  lastOllamaDiscoveryLogAt = now;
  return true;
};

/**
 * Options for filtering the list of AI models.
 */
type ListBrainModelsOptions = {
  family?: BrainModelFamily;
  modality?: BrainModelModality;
  streaming?: boolean;
};

/**
 * Internal status of catalog repair operations.
 */
type CatalogRepairStatus = 'reset' | null;

/**
 * Normalizes and deduplicates an array of strings.
 * 
 * @param values - Raw string values.
 * @returns Normalized and unique strings.
 */
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

/**
 * Generates potential Ollama host variations to improve discovery.
 * 
 * @param baseUrl - The configured base URL.
 * @returns A list of candidate base URLs.
 */
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
    // If running on localhost, try common aliases and Docker host IP
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

/**
 * Builds all possible discovery URLs for Ollama models based on the configured base URL.
 * Probes both standard Ollama API and OpenAI-compatible endpoints.
 * 
 * @param baseUrl - The base URL of the Ollama server.
 * @returns An array of URLs to probe for models.
 */
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

/**
 * Parses model IDs from Ollama or OpenAI-compatible discovery responses.
 * 
 * @param payload - The raw response payload.
 * @returns An array of discovered model IDs.
 */
const parseDiscoveredModelIds = (payload: unknown): string[] => {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;

  // Try parsing from Ollama standard /api/tags
  const ollamaModels = Array.isArray(record['models'])
    ? (record['models'] as Array<Record<string, unknown>>)
    : [];
  const fromOllamaTags = ollamaModels.map((model): string => {
    const name = typeof model?.['name'] === 'string' ? model['name'] : '';
    const modelId = typeof model?.['model'] === 'string' ? model['model'] : '';
    return (name || modelId).trim();
  });

  // Try parsing from OpenAI-compatible /v1/models
  const openAiCompatibleModels = Array.isArray(record['data'])
    ? (record['data'] as Array<Record<string, unknown>>)
    : [];
  const fromOpenAiCompatible = openAiCompatibleModels.map((model): string => {
    const id = typeof model?.['id'] === 'string' ? model['id'] : '';
    return id.trim();
  });

  return normalizeUnique([...fromOllamaTags, ...fromOpenAiCompatible]);
};

/**
 * Resets the provider catalog to default values when the stored payload is corrupted.
 * 
 * @returns The reset catalog and status.
 */
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

/**
 * Fetches models from a specific discovery URL with a timeout.
 * 
 * @param url - The URL to fetch from.
 * @returns The discovered models or null if the fetch failed.
 */
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

/**
 * Builds a descriptive error for Ollama discovery failures.
 * 
 * @param error - The underlying error.
 * @returns A formatted Error object.
 */
const buildOllamaDiscoveryFailureError = (error: unknown): Error =>
  new Error(`Ollama server unreachable at ${OLLAMA_BASE_URL}.`, {
    cause: error instanceof Error ? error : new Error(String(error ?? 'Unknown error')),
  });

/**
 * Reports Ollama discovery failure to the observability system.
 * 
 * @param failure - Failure details including URL and error.
 */
const reportOllamaDiscoveryFailure = (failure: { url: string; error: unknown }): void => {
  if (!shouldLogOllamaDiscoveryFailure()) {
    return;
  }
  void ErrorSystem.captureException(buildOllamaDiscoveryFailureError(failure.error), {
    service: 'ai-brain-model-catalog',
    baseUrl: OLLAMA_BASE_URL,
    url: failure.url,
  });
};

/**
 * Attempts to fetch live models from Ollama by probing multiple discovery URLs.
 * 
 * @returns The list of discovered models, or null if all probes failed.
 */
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
  if (lastFailure) {
    reportOllamaDiscoveryFailure(lastFailure);
  }
  return null;
};

/**
 * Checks if a model ID matches a specific family based on predefined tokens.
 * 
 * @param normalizedModelId - The normalized model ID in lowercase.
 * @param matcher - The matcher configuration to check against.
 * @returns True if the model ID matches the family.
 */
const matchesModelFamily = (
  normalizedModelId: string,
  matcher: (typeof MODEL_FAMILY_MATCHERS)[number]
): boolean =>
  matcher.matches.some((token) => normalizedModelId.includes(token)) ||
  (matcher.startsWith?.some((token) => normalizedModelId.startsWith(token)) ?? false);

/**
 * Classifies an AI model into a family based on its ID patterns.
 * 
 * @param modelId - The model ID to classify.
 * @returns The inferred BrainModelFamily.
 */
const classifyBrainModelFamily = (modelId: string): BrainModelFamily => {
  const normalized = normalizeBrainRuntimeModelId(modelId).toLowerCase();
  for (const matcher of MODEL_FAMILY_MATCHERS) {
    if (matchesModelFamily(normalized, matcher)) {
      return matcher.family;
    }
  }
  return 'chat';
};

/**
 * Mapping of model families to their primary modalities.
 */
const modalityByFamily: Record<BrainModelFamily, BrainModelModality> = {
  chat: 'text',
  embedding: 'text',
  validation: 'text',
  image_generation: 'image',
  vision_extract: 'multimodal',
  ocr: 'multimodal',
};

/**
 * Generates a full descriptor for an AI model, including its family, modality, and capabilities.
 * 
 * @param modelId - The ID of the model to describe.
 * @returns A BrainModelDescriptor containing model metadata.
 */
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

/**
 * Lists all available AI models from presets, settings, and live discovery.
 * Resolves the catalog by merging:
 * 1. Hardcoded model presets
 * 2. Manually configured paid models
 * 3. Configured Ollama models
 * 4. Live-discovered models from the local Ollama instance
 * 
 * @param options - Filtering options (family, modality, streaming support).
 * @returns A response containing filtered models, descriptors, and source info.
 */
export const listBrainModels = async (
  options: ListBrainModelsOptions = {}
): Promise<BrainModelsResponse> => {
  // Read catalog from stored settings
  const providerCatalogRaw = await readStoredSettingValue(AI_BRAIN_PROVIDER_CATALOG_KEY);
  let providerCatalog = defaultBrainProviderCatalog;
  let providerCatalogRepairStatus: CatalogRepairStatus = null;

  if (providerCatalogRaw?.trim().length) {
    try {
      providerCatalog = parseBrainProviderCatalog(providerCatalogRaw);
    } catch (error) {
      void ErrorSystem.captureException(error);
      // Corrupted catalog data triggers an automatic reset to defaults
      const repaired = await resetProviderCatalog();
      providerCatalog = repaired.catalog;
      providerCatalogRepairStatus = repaired.status;
    }
  }
  
  // Probing for live Ollama models
  const liveOllamaModels = await fetchLiveOllamaModels();
  
  // Convert catalog entries to partitioned arrays
  const catalogArrays = entriesToCatalogArrays(catalogToEntries(providerCatalog));

  const modelPresets = normalizeUnique(catalogArrays.modelPresets);
  const paidModels = normalizeUnique(catalogArrays.paidModels);
  const configuredOllamaModels = normalizeUnique(catalogArrays.ollamaModels);
  const liveModels = normalizeUnique(liveOllamaModels ?? []);

  // Merge all sources into a unique list of model IDs
  const combined = normalizeUnique([
    ...modelPresets,
    ...paidModels,
    ...configuredOllamaModels,
    ...liveModels,
  ]);

  // Generate descriptors for all combined models
  const descriptors = Object.fromEntries(
    combined.map((modelId: string): [string, BrainModelDescriptor] => [
      modelId,
      describeBrainModel(modelId),
    ])
  );

  // Apply filters based on options
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

  // Handle warnings for unavailable services or repaired data
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
