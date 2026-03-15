import { DEBUG_CHATBOT } from '@/features/ai/agent-runtime/core/config';
import type { PlanStep } from '@/shared/contracts/agent-runtime';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const parseJsonObject = (content: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed;
  } catch (error) {
    logClientError(error);
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      const parsed: unknown = JSON.parse(content.slice(start, end + 1));
      return parsed;
    } catch (error) {
      logClientError(error);
      return null;
    }
  }
};

const runApprovalGateTask = async (input: {
  model: string;
  systemPrompt: string;
  userContent: string;
  temperature?: number;
}): Promise<string> => {
  const response = await runBrainChatCompletion({
    modelId: input.model,
    temperature: input.temperature ?? 0.1,
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

export function requiresHumanApproval(step: PlanStep, prompt: string): boolean {
  if (step.tool === 'none') return false;
  const text = `${step.title} ${prompt}`.toLowerCase();
  return /login|log in|sign in|signup|register|checkout|purchase|pay|payment|card|delete|remove|cancel|unsubscribe|transfer|withdraw|submit order|place order|invoice|billing|confirm|approve|admin/i.test(
    text
  );
}

export async function evaluateApprovalGateWithLLM({
  prompt,
  step,
  model,
  browserContext,
  runId,
}: {
  prompt: string;
  step: PlanStep;
  model: string;
  browserContext?: {
    url: string;
    title: string | null;
  } | null;
  runId?: string;
}): Promise<{
  requiresApproval: boolean;
  reason?: string | null;
  riskLevel?: string | null;
} | null> {
  try {
    const content = await runApprovalGateTask({
      model,
      systemPrompt:
        'You decide whether a planned web action requires human approval. Return only JSON with keys: requiresApproval (boolean), reason (string), riskLevel (low|medium|high), riskySignals (array). Flag any step that involves login, payments, deletions, account changes, admin actions, or irreversible changes.',
      userContent: JSON.stringify({
        prompt,
        step: {
          title: step.title,
          tool: step.tool ?? null,
          expectedObservation: step.expectedObservation ?? null,
          successCriteria: step.successCriteria ?? null,
        },
        browserContext: browserContext
          ? { url: browserContext.url, title: browserContext.title }
          : null,
      }),
    });
    const parsed = parseJsonObject(content) as {
      requiresApproval?: boolean;
      reason?: string;
      riskLevel?: string;
    } | null;
    if (!parsed || typeof parsed.requiresApproval !== 'boolean') {
      throw new Error('Approval gate model returned invalid JSON.');
    }
    return {
      requiresApproval: parsed.requiresApproval,
      reason: parsed.reason ?? null,
      riskLevel: parsed.riskLevel ?? null,
    };
  } catch (error) {
    logClientError(error);
    if (runId && DEBUG_CHATBOT) {
      void ErrorSystem.logWarning('Approval gate model failed', {
        service: 'agent-engine',
        action: 'approval-gate',
        runId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}
