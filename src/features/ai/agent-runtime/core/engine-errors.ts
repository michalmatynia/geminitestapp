import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { type getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type RunDelegate = {
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
};

export async function handleRunError(
  runId: string,
  error: unknown,
  chatbotAgentRun: ReturnType<typeof getChatbotAgentRunDelegate>
): Promise<void> {
  const chatbotAgentRunError = chatbotAgentRun as RunDelegate | null;
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const nowIso = new Date().toISOString();

  await ErrorSystem.captureException(error, {
    service: 'agent-runtime',
    runId,
  });

  await logAgentAudit(runId, 'error', 'Agent run loop failed.', {
    error: message,
    timestamp: nowIso,
  });

  if (chatbotAgentRunError) {
    await chatbotAgentRunError.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorMessage: message,
        requiresHumanIntervention: false,
        finishedAt: new Date(),
        logLines: {
          push: `[${nowIso}] Agent loop failure: ${message}`,
        },
      },
    });
  }
}
