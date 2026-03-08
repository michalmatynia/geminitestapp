import 'server-only';

import OpenAI from 'openai';

import { configurationError, operationFailedError } from '@/shared/errors/app-error';

import { inferBrainRuntimeVendor, normalizeBrainRuntimeModelId } from './server-runtime-client';
import { resolveOllamaBaseUrl } from './ollama-config';
import { resolveBrainProviderCredential } from './provider-credentials';

const OLLAMA_BASE_URL = resolveOllamaBaseUrl();

const resolveOpenAiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('openai');
};

const extractEmbedding = (payload: unknown): number[] | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record['embedding'])) {
    const vector = (record['embedding'] as unknown[]).filter(
      (value: unknown): value is number => typeof value === 'number'
    );
    return vector.length > 0 ? vector : null;
  }
  if (Array.isArray(record['embeddings']) && Array.isArray(record['embeddings'][0])) {
    const vector = (record['embeddings'][0] as unknown[]).filter(
      (value: unknown): value is number => typeof value === 'number'
    );
    return vector.length > 0 ? vector : null;
  }
  return null;
};

export const generateBrainEmbedding = async (input: {
  modelId: string;
  text: string;
}): Promise<number[]> => {
  const modelId = input.modelId.trim();
  const text = input.text.trim();
  if (!modelId) throw configurationError('Embedding model is required.');
  if (!text) throw configurationError('Embedding text is required.');

  const vendor = inferBrainRuntimeVendor(modelId);
  const normalizedModelId = normalizeBrainRuntimeModelId(modelId);

  if (vendor === 'openai') {
    const client = new OpenAI({ apiKey: await resolveOpenAiApiKey() });
    const response = await client.embeddings.create({
      model: normalizedModelId,
      input: text,
    });
    const embedding = response.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw operationFailedError('OpenAI embedding response was empty.');
    }
    return embedding;
  }

  if (vendor !== 'ollama') {
    throw configurationError(
      `Embeddings are not supported for Brain-assigned provider "${vendor}" in this runtime.`
    );
  }

  const candidates: Array<{ url: string; body: Record<string, unknown> }> = [
    {
      url: `${OLLAMA_BASE_URL}/api/embeddings`,
      body: { model: normalizedModelId, prompt: text },
    },
    {
      url: `${OLLAMA_BASE_URL}/api/embed`,
      body: { model: normalizedModelId, input: text },
    },
    {
      url: `${OLLAMA_BASE_URL}/api/embeddings`,
      body: { model: normalizedModelId, input: text },
    },
    {
      url: `${OLLAMA_BASE_URL}/api/embed`,
      body: { model: normalizedModelId, prompt: text },
    },
  ];

  let lastError: string | null = null;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate.body),
      });
      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        lastError = message || response.statusText;
        continue;
      }
      const payload = (await response.json()) as unknown;
      const embedding = extractEmbedding(payload);
      if (embedding && embedding.length > 0) {
        return embedding;
      }
      lastError = 'Embedding payload was empty.';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw operationFailedError(`Ollama embedding request failed: ${lastError ?? 'unknown error'}`);
};
