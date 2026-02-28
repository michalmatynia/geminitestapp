export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

export const resolveOllamaBaseUrl = (): string => {
  const raw = process.env['OLLAMA_BASE_URL']?.trim() ?? '';
  const base = raw || DEFAULT_OLLAMA_BASE_URL;
  return base.replace(/\/+$/, '');
};
