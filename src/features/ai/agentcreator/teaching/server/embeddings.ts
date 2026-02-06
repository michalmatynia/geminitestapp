import 'server-only';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

const extractEmbedding = (payload: unknown): number[] | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.embedding)) {
    const vec = record.embedding.filter((v: unknown): v is number => typeof v === 'number');
    return vec.length > 0 ? vec : null;
  }
  if (Array.isArray(record.embeddings) && Array.isArray(record.embeddings[0])) {
    const first = record.embeddings[0] as unknown[];
    const vec = first.filter((v: unknown): v is number => typeof v === 'number');
    return vec.length > 0 ? vec : null;
  }
  return null;
};

export async function generateOllamaEmbedding(params: {
  model: string;
  text: string;
}): Promise<number[]> {
  const model = params.model.trim();
  const text = params.text;
  if (!model) throw new Error('Embedding model is required.');
  if (!text.trim()) throw new Error('Text is required.');

  const candidates: Array<{ url: string; body: Record<string, unknown> }> = [
    { url: `${OLLAMA_BASE_URL}/api/embeddings`, body: { model, prompt: text } },
    { url: `${OLLAMA_BASE_URL}/api/embed`, body: { model, input: text } },
    { url: `${OLLAMA_BASE_URL}/api/embeddings`, body: { model, input: text } },
    { url: `${OLLAMA_BASE_URL}/api/embed`, body: { model, prompt: text } },
  ];

  let lastError: string | null = null;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate.body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        lastError = `Ollama embedding failed (${res.status}): ${text || res.statusText}`;
        continue;
      }
      const payload: unknown = await res.json();
      const embedding = extractEmbedding(payload);
      if (!embedding) {
        lastError = 'Ollama embedding response missing embedding vector.';
        continue;
      }
      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError ?? 'Failed to generate embedding.');
}

