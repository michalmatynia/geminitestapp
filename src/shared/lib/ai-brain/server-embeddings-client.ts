/**
 * AI Brain Server Embeddings Client
 * 
 * Server-side embeddings generation client for AI models.
 * Provides:
 * - Text embedding generation
 * - Multi-vendor embedding support (OpenAI, Ollama)
 * - Model ID normalization
 * - Provider credential resolution
 * - Server-only embedding operations
 */

import 'server-only';

import OpenAI from 'openai';

import { configurationError, operationFailedError } from '@/shared/errors/app-error';

import { resolveOllamaBaseUrl } from './ollama-config';
import { resolveBrainProviderCredential } from './provider-credentials';
import { inferBrainRuntimeVendor, normalizeBrainRuntimeModelId } from './server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const OLLAMA_BASE_URL = resolveOllamaBaseUrl();

/**
 * Resolves the OpenAI API key from AI Brain settings or environment.
 * 
 * @returns The resolved OpenAI API key.
 */
const resolveOpenAiApiKey = async (): Promise<string> => {
  return resolveBrainProviderCredential('openai');
};

/**
 * Extracts an embedding vector from various known API response shapes.
 * Handles differences between Ollama and OpenAI response formats.
 * 
 * @param payload - The raw API response payload.
 * @returns The extracted embedding as a number array, or null if not found.
 */
const extractEmbedding = (payload: unknown): number[] | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  // Case 1: Standard 'embedding' field (Ollama/OpenAI)
  if (Array.isArray(record['embedding'])) {
    const vector = (record['embedding'] as unknown[]).filter(
      (value: unknown): value is number => typeof value === 'number'
    );
    return vector.length > 0 ? vector : null;
  }

  // Case 2: Nested 'embeddings' array (Batch or alternative Ollama format)
  if (Array.isArray(record['embeddings']) && Array.isArray(record['embeddings'][0])) {
    const vector = (record['embeddings'][0] as unknown[]).filter(
      (value: unknown): value is number => typeof value === 'number'
    );
    return vector.length > 0 ? vector : null;
  }
  return null;
};

/**
 * Generates an embedding vector for the provided text using the specified model.
 * Automatically routes the request to either OpenAI or Ollama based on the model ID.
 * 
 * @param input - Object containing modelId and the text to embed.
 * @returns The generated embedding vector.
 * @throws {AppError} If configuration is invalid or embedding generation fails.
 */
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

  // Route to OpenAI
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

  // Currently only OpenAI and Ollama are supported for embeddings in this runtime
  if (vendor !== 'ollama') {
    throw configurationError(
      `Embeddings are not supported for Brain-assigned provider "${vendor}" in this runtime.`
    );
  }

  // Ollama has multiple potential endpoints and request shapes depending on version
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
  // Iterate through candidates until one succeeds
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
      void ErrorSystem.captureException(error);
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw operationFailedError(`Ollama embedding request failed: ${lastError ?? 'unknown error'}`);
};
