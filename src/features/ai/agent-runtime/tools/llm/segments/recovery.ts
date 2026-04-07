import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { LLMContext, runStructuredAgentRuntimeTask } from './shared';

export const buildFailureRecoveryPlan = async (
  context: LLMContext,
  request: {
    type: 'bad_selectors' | 'login_stuck' | 'missing_extraction';
    prompt: string;
    url: string;
    domTextSample: string;
    uiInventory: unknown;
    extractionPlan?: unknown;
    loginCandidates?: unknown;
  },
  inferenceModel?: string | null
): Promise<{
  reason: string | null;
  selectors: string[];
  listingUrls: string[];
  clickSelector: string | null;
  loginUrl: string | null;
  usernameSelector: string | null;
  passwordSelector: string | null;
  submitSelector: string | null;
  notes: string | null;
} | null> => {
  const { runId, model, log, activeStepId } = context;
  if (!request.uiInventory) return null;
  try {
    const resolvedModel = inferenceModel ?? model;
    const parsed = await runStructuredAgentRuntimeTask({
      model: resolvedModel,
      temperature: 0.2,
      systemPrompt:
        'You recover failed web automation. Return only JSON with keys: reason, selectors, listingUrls, clickSelector, loginUrl, usernameSelector, passwordSelector, submitSelector, notes. Provide only fields relevant to the failure type.',
      userContent: JSON.stringify({
        failureType: request.type,
        prompt: request.prompt,
        url: request.url,
        domTextSample: request.domTextSample,
        uiInventory: request.uiInventory,
        extractionPlan: request.extractionPlan ?? null,
        loginCandidates: request.loginCandidates ?? null,
      }),
    });
    const selectors = Array.isArray(parsed?.['selectors'])
      ? (parsed?.['selectors'] as unknown[]).filter(
        (selector: unknown) => typeof selector === 'string'
      )
      : [];
    const listingUrls = Array.isArray(parsed?.['listingUrls'])
      ? (parsed?.['listingUrls'] as unknown[]).filter((item: unknown) => typeof item === 'string')
      : [];
    const plan = {
      reason: typeof parsed?.['reason'] === 'string' ? parsed?.['reason'] : null,
      selectors,
      listingUrls,
      clickSelector:
        typeof parsed?.['clickSelector'] === 'string' ? parsed?.['clickSelector'] : null,
      loginUrl: typeof parsed?.['loginUrl'] === 'string' ? parsed?.['loginUrl'] : null,
      usernameSelector:
        typeof parsed?.['usernameSelector'] === 'string' ? parsed?.['usernameSelector'] : null,
      passwordSelector:
        typeof parsed?.['passwordSelector'] === 'string' ? parsed?.['passwordSelector'] : null,
      submitSelector:
        typeof parsed?.['submitSelector'] === 'string' ? parsed?.['submitSelector'] : null,
      notes: typeof parsed?.['notes'] === 'string' ? parsed?.['notes'] : null,
    };
    if (log) {
      await log('info', 'LLM failure recovery plan created.', {
        stepId: activeStepId ?? null,
        failureType: request.type,
        plan,
      });
    }
    const agentAuditLog = getAgentAuditLogDelegate();
    await agentAuditLog?.create({
      data: {
        runId,
        level: 'info',
        message: 'LLM failure recovery plan created.',
        metadata: {
          failureType: request.type,
          plan,
          model: resolvedModel,
          stepId: activeStepId ?? null,
        },
      },
    });
    return plan;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'LLM failure recovery plan failed.', {
        stepId: activeStepId ?? null,
        failureType: request.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};
