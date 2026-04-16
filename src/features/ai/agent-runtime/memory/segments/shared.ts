import 'server-only';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { MemoryScope } from '@/shared/contracts/agent-runtime';

export type { MemoryScope };
export const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

export const parseJsonObject = (raw: string): unknown => {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};
