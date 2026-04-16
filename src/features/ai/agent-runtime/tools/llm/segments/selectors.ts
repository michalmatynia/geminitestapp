import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { type AgentLlmContext } from '@/shared/contracts/agent-runtime';
import { runStructuredAgentRuntimeTask } from './shared';

export const inferSelectorsFromLLM = async (
  context: AgentLlmContext,
  uiInventory: unknown,
  domTextSample: string,
  task: string,
  label: string,
  inferenceModel?: string | null
): Promise<string[]> => {
  const { runId, model, log, activeStepId } = context;
  if (!uiInventory) return [];
  try {
    const resolvedModel = inferenceModel ?? model;
    const parsed = await runStructuredAgentRuntimeTask({
      model: resolvedModel,
      temperature: 0.2,
      systemPrompt:
        'You are a DOM selector expert. Return only JSON with a \'selectors\' array. Use concise, robust CSS selectors.',
      userContent: JSON.stringify({
        task,
        domTextSample,
        uiInventory,
      }),
    });
    const selectors = Array.isArray(parsed?.['selectors'])
      ? (parsed?.['selectors'] as unknown[]).filter(
        (selector: unknown) => typeof selector === 'string'
      )
      : [];
    if (log) {
      await log('info', 'LLM selector inference completed.', {
        stepId: activeStepId ?? null,
        label,
        task,
        selectors,
      });
    }
    const agentAuditLog = getAgentAuditLogDelegate();
    await agentAuditLog?.create({
      data: {
        runId,
        level: 'info',
        message: 'LLM selector inference completed.',
        metadata: {
          label,
          task,
          selectors,
          model: resolvedModel,
          stepId: activeStepId ?? null,
        },
      },
    });
    return selectors;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'LLM selector inference failed.', {
        stepId: activeStepId ?? null,
        label,
        task,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return [];
  }
};
