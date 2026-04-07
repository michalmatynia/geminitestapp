import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { LLMContext, runStructuredAgentRuntimeTask } from './shared';

export const validateExtractionWithLLM = async (
  context: LLMContext,
  params: {
    prompt: string;
    url: string;
    extractionType: 'product_names' | 'emails';
    requiredCount: number;
    items: string[];
    domTextSample: string;
    targetHostname: string | null;
    evidence: Array<{ item: string; snippet: string }>;
  }
): Promise<{
  valid: boolean;
  acceptedItems: string[];
  rejectedItems: string[];
  issues: string[];
  missingCount: number;
  evidence: Array<{ item: string; snippet: string }>;
}> => {
  const { model } = context;
  const {
    prompt,
    url,
    extractionType,
    requiredCount,
    items,
    domTextSample,
    targetHostname,
    evidence,
  } = params;

  try {
    const parsed = await runStructuredAgentRuntimeTask({
      model,
      temperature: 0.2,
      systemPrompt:
        'You validate extraction results against the user goal. Return only JSON with keys: valid (boolean), acceptedItems (array), rejectedItems (array), issues (array of strings), missingCount (number), evidence (array of {item, snippet, reason}). Each accepted item must cite evidence from the provided snippets. If the URL hostname does not match targetHostname (when provided), mark valid=false. If stepLabel is provided, ensure accepted items align with that step context. For product_names, reject non-product UI text (cookies, headings, nav labels).',
      userContent: JSON.stringify({
        prompt,
        url,
        extractionType,
        requiredCount,
        items,
        domTextSample,
        targetHostname,
        evidence,
        stepId: context.activeStepId,
        stepLabel: context.stepLabel,
      }),
    });
    const acceptedItems = Array.isArray(parsed?.['acceptedItems'])
      ? (parsed?.['acceptedItems'] as unknown[]).filter((item: unknown) => typeof item === 'string')
      : [];
    const rejectedItems = Array.isArray(parsed?.['rejectedItems'])
      ? (parsed?.['rejectedItems'] as unknown[]).filter((item: unknown) => typeof item === 'string')
      : [];
    const issues = Array.isArray(parsed?.['issues'])
      ? (parsed?.['issues'] as unknown[]).filter((item: unknown) => typeof item === 'string')
      : [];
    const missingCount =
      typeof parsed?.['missingCount'] === 'number'
        ? parsed?.['missingCount']
        : Math.max(0, requiredCount - acceptedItems.length);
    const valid =
      typeof parsed?.['valid'] === 'boolean'
        ? parsed?.['valid']
        : acceptedItems.length >= requiredCount;
    return {
      valid,
      acceptedItems,
      rejectedItems,
      issues,
      missingCount,
      evidence: Array.isArray(parsed?.['evidence'])
        ? (parsed?.['evidence'] as unknown[]).filter(
          (item: unknown): item is { item: string; snippet: string } =>
            typeof item === 'object' &&
              item !== null &&
              'item' in item &&
              typeof (item as Record<string, unknown>)['item'] === 'string' &&
              'snippet' in item &&
              typeof (item as Record<string, unknown>)['snippet'] === 'string'
        )
        : [],
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    const fallbackAccepted = evidence.map((entry: { item: string; snippet: string }) => entry.item);
    return {
      valid: fallbackAccepted.length >= requiredCount,
      acceptedItems: fallbackAccepted,
      rejectedItems: items.filter((item: string) => !fallbackAccepted.includes(item)),
      issues: [`LLM validation failed: ${error instanceof Error ? error.message : String(error)}`],
      missingCount: Math.max(0, requiredCount - fallbackAccepted.length),
      evidence,
    };
  }
};

export const normalizeExtractionItemsWithLLM = async (
  _context: LLMContext,
  params: {
    prompt: string;
    extractionType: 'product_names' | 'emails';
    items: string[];
    normalizationModel?: string | null;
  }
): Promise<string[]> => {
  const { prompt, extractionType, items, normalizationModel } = params;
  if (!normalizationModel || items.length === 0) {
    return items;
  }
  try {
    const parsed = await runStructuredAgentRuntimeTask({
      model: normalizationModel,
      temperature: 0.1,
      systemPrompt:
        'You clean extracted outputs. Return only JSON with key \'items\' as an array of cleaned strings. Remove hashes, IDs, boilerplate, and duplicates. Keep original ordering where possible. For emails, return lowercase valid emails only.',
      userContent: JSON.stringify({
        prompt,
        extractionType,
        items,
      }),
    });
    const cleaned = Array.isArray(parsed?.['items'])
      ? (parsed?.['items'] as unknown[]).filter((item: unknown) => typeof item === 'string')
      : [];
    return cleaned.length > 0 ? cleaned : items;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return items;
  }
};

export const buildExtractionPlan = async (
  context: LLMContext,
  request: {
    type: 'product_names' | 'emails';
    domTextSample: string;
    uiInventory: unknown;
  },
  inferenceModel?: string | null
): Promise<{
  target: string | null;
  fields: string[];
  primarySelectors: string[];
  fallbackSelectors: string[];
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
        'You are an extraction planner. Return only JSON with keys: target, fields, primarySelectors, fallbackSelectors, notes. target is the data entity. fields is an array of field names. primarySelectors/fallbackSelectors are arrays of CSS selectors.',
      userContent: JSON.stringify({
        request: request.type,
        domTextSample: request.domTextSample,
        uiInventory: request.uiInventory,
      }),
    });
    const primarySelectors = Array.isArray(parsed?.['primarySelectors'])
      ? (parsed?.['primarySelectors'] as unknown[]).filter(
        (selector: unknown) => typeof selector === 'string'
      )
      : [];
    const fallbackSelectors = Array.isArray(parsed?.['fallbackSelectors'])
      ? (parsed?.['fallbackSelectors'] as unknown[]).filter(
        (selector: unknown) => typeof selector === 'string'
      )
      : [];
    const plan = {
      target: typeof parsed?.['target'] === 'string' ? parsed?.['target'] : null,
      fields: Array.isArray(parsed?.['fields'])
        ? (parsed?.['fields'] as unknown[]).filter((field: unknown) => typeof field === 'string')
        : [],
      primarySelectors,
      fallbackSelectors,
      notes: typeof parsed?.['notes'] === 'string' ? parsed?.['notes'] : null,
    };
    if (log) {
      await log('info', 'LLM extraction plan created.', {
        stepId: activeStepId ?? null,
        plan,
      });
    }
    const agentAuditLog = getAgentAuditLogDelegate();
    await agentAuditLog?.create({
      data: {
        runId,
        level: 'info',
        message: 'LLM extraction plan created.',
        metadata: {
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
      await log('warning', 'LLM extraction plan failed.', {
        stepId: activeStepId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};
