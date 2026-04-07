import 'server-only';

import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { AgentLlmContext } from '@/shared/contracts/agent-runtime';

export type LLMContext = AgentLlmContext;

export const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : raw;
  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed as Record<string, unknown>;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const runStructuredAgentRuntimeTask = async (input: {
  model: string;
  temperature: number;
  systemPrompt: string;
  userContent: string;
}): Promise<Record<string, unknown> | null> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature,
    jsonMode: true,
    messages: [
      {
        role: 'system',
        content: input.systemPrompt,
      },
      {
        role: 'user',
        content: input.userContent,
      },
    ],
  });
  return parseJsonObject(response.text);
};
