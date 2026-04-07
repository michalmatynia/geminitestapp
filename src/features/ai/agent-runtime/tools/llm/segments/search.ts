import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { LLMContext, runStructuredAgentRuntimeTask } from './shared';

export const buildSearchQueryWithLLM = async (
  context: LLMContext,
  prompt: string
): Promise<string | null> => {
  const { model, log, activeStepId } = context;
  try {
    const parsed = await runStructuredAgentRuntimeTask({
      model,
      temperature: 0.2,
      systemPrompt:
        'You craft concise web search queries. Return only JSON with keys: query, intent.',
      userContent: JSON.stringify({ prompt }),
    });
    const query = typeof parsed?.['query'] === 'string' ? parsed['query'].trim() : '';
    return query || null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'LLM search query inference failed.', {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const pickSearchResultWithLLM = async (
  context: LLMContext,
  query: string,
  prompt: string,
  results: Array<{ title: string; url: string }>
): Promise<string | null> => {
  const { model, log, activeStepId } = context;
  try {
    const parsed = await runStructuredAgentRuntimeTask({
      model,
      temperature: 0.2,
      systemPrompt: 'You select the best URL for the user task. Return only JSON with key: url.',
      userContent: JSON.stringify({ query, prompt, results }),
    });
    const url = typeof parsed?.['url'] === 'string' ? parsed['url'].trim() : '';
    return url || null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'LLM search result selection failed.', {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

export const decideSearchFirstWithLLM = async (
  context: LLMContext,
  prompt: string,
  targetUrl: string | null,
  hasExplicitUrl: boolean,
  _memoryKey?: string | null,
  _memoryValidationModel?: string | null,
  _memorySummarizationModel?: string | null
): Promise<{ useSearchFirst: boolean; query: string | null; reason: unknown } | null> => {
  const { runId, model, log, activeStepId } = context;
  if (!prompt || hasExplicitUrl) return null;
  try {
    const parsed = await runStructuredAgentRuntimeTask({
      model,
      temperature: 0.2,
      systemPrompt:
        'You decide whether to use web search before direct navigation. Return only JSON with keys: useSearchFirst (boolean), reason, query.',
      userContent: JSON.stringify({
        prompt,
        inferredUrl: targetUrl,
        hasExplicitUrl,
      }),
    });
    const useSearchFirst = Boolean(parsed?.['useSearchFirst']);
    const query = typeof parsed?.['query'] === 'string' ? parsed['query'].trim() : '';
    if (log) {
      await log('info', 'Tool selection decision.', {
        stepId: activeStepId ?? null,
        decision: useSearchFirst ? 'search-first' : 'direct-navigation',
        reason: typeof parsed?.['reason'] === 'string' ? parsed?.['reason'] : null,
        query: query || null,
      });
    }

    const agentAuditLog = getAgentAuditLogDelegate();
    await agentAuditLog?.create({
      data: {
        runId,
        level: 'info',
        message: 'Tool selection decision.',
        metadata: {
          decision: useSearchFirst ? 'search-first' : 'direct-navigation',
          reason: typeof parsed?.['reason'] === 'string' ? parsed?.['reason'] : null,
          query: query || null,
          inferredUrl: targetUrl,
        },
      },
    });
    return { useSearchFirst, query: query || null, reason: parsed?.['reason'] };
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (log) {
      await log('warning', 'Tool selection decision failed.', {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};
