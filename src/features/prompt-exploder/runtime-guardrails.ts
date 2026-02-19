import type { PromptValidationOrchestrationResult } from './prompt-validation-orchestrator';

const formatResolutionReason = (
  reason: PromptValidationOrchestrationResult['stackResolution']['reason']
): string => {
  if (reason === 'invalid_stack') return 'an invalid stack fallback';
  if (reason === 'scope_fallback') return 'a scope fallback';
  if (reason === 'default_scope') return 'a default-scope fallback';
  return 'a runtime fallback';
};

export const getPromptExploderRuntimeGuardrailIssue = (args: {
  runtimeSelection: PromptValidationOrchestrationResult;
  allowValidationStackFallback: boolean;
}): string | null => {
  const { runtimeSelection, allowValidationStackFallback } = args;
  if (allowValidationStackFallback) return null;
  if (!runtimeSelection.stackResolution.usedFallback) return null;
  const reason = formatResolutionReason(runtimeSelection.stackResolution.reason);
  return `Prompt Exploder blocked runtime execution because validation stack "${runtimeSelection.stackResolution.stack}" was resolved via ${reason}. Select an explicit stack in the UI or enable "Allow Validation Stack Fallback".`;
};

