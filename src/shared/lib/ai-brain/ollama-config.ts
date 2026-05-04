/**
 * Ollama Configuration
 * 
 * Configuration utilities for Ollama local AI models.
 * Provides:
 * - Ollama base URL resolution
 * - Environment variable configuration
 * - Default URL fallback
 * - URL normalization
 * - Local model server configuration
 */

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

export const resolveOllamaBaseUrl = (): string => {
  const raw = process.env['OLLAMA_BASE_URL']?.trim() ?? '';
  const base = raw || DEFAULT_OLLAMA_BASE_URL;
  return base.replace(/\/+$/, '');
};
