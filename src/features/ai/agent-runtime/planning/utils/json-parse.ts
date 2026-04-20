import { logClientError } from '@/shared/utils/observability/client-error-logger';

export function parsePlanJson(content: string): unknown {
  if (!content) return null;
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : content;
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}$/);
  const jsonText = match ? match[0] : raw;
  if (!jsonText) return null;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    logClientError(error);
    return null;
  }
}
