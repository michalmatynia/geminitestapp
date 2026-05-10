import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';

export const runPlanningPostprocessTask = async (input: {
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
}): Promise<string> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature ?? 0.2,
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
  return response.text.trim();
};

export const recordPostprocessAudit = async (
  runId: string | undefined,
  message: string,
  metadata: Record<string, unknown>
): Promise<void> => {
  const agentAuditLog = getAgentAuditLogDelegate();
  if (runId !== undefined && runId !== '') {
    await agentAuditLog.create({
      data: {
        runId,
        level: 'info',
        message,
        metadata,
      },
    });
  }
};
