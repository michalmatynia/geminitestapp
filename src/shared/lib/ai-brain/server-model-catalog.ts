import 'server-only';

import type {
  BrainModelDescriptor,
  BrainModelFamily,
  BrainModelModality,
  BrainModelsResponse,
} from '@/shared/contracts/ai-brain';

import { AI_BRAIN_PROVIDER_CATALOG_KEY, parseBrainProviderCatalog } from './settings';
import {
  inferBrainRuntimeVendor,
  normalizeBrainRuntimeModelId,
  supportsBrainJsonMode,
  supportsBrainStreaming,
} from './server-runtime-client';
import { readStoredSettingValue } from './server';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODELS_TIMEOUT_MS = 2_500;

type ListBrainModelsOptions = {
  family?: BrainModelFamily;
  modality?: BrainModelModality;
  streaming?: boolean;
};

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
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_MODELS_TIMEOUT_MS);
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
          typeof model.name === 'string' ? model.name : ''
        )
        .filter(Boolean)
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
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
  const providerCatalog = parseBrainProviderCatalog(providerCatalogRaw);
  const liveOllamaModels = await fetchLiveOllamaModels();

  const modelPresets = normalizeUnique(providerCatalog.modelPresets ?? []);
  const paidModels = normalizeUnique(providerCatalog.paidModels ?? []);
  const configuredOllamaModels = normalizeUnique(providerCatalog.ollamaModels ?? []);
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

  const warning =
    liveOllamaModels === null
      ? {
        code: 'OLLAMA_UNAVAILABLE',
        message: 'Live Ollama discovery failed. Showing Brain-configured model catalog only.',
      }
      : undefined;

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
