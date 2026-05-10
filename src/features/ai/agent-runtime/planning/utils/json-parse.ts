import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function parsePlanJson(content: string): unknown {
  if (content.trim() === '') return null;
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch !== null ? fencedMatch[1] : content;
  if (raw.trim() === '') return null;
  const match = raw.match(/\{[\s\S]*\}$/);
  const jsonText = match !== null ? match[0] : raw;
  if (jsonText.trim() === '') return null;
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    logClientError(error);
    return null;
  }
}

