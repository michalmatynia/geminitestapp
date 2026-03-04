import type { PromptValidationOrchestrationResult } from './prompt-validation-orchestrator';

const formatResolutionReason = (
  reason: PromptValidationOrchestrationResult['stackResolution']['reason']
): string => reason;

export const getPromptExploderRuntimeGuardrailIssue = (args: {
  runtimeSelection: PromptValidationOrchestrationResult;
}): string | null => {
  const { runtimeSelection } = args;
  if (!runtimeSelection.stackResolution.usedFallback) return null;
  const reason = formatResolutionReason(runtimeSelection.stackResolution.reason);
  return `Prompt Exploder blocked runtime execution because legacy stack fallback paths are disabled (reason: ${reason}). Select a canonical validation stack and save settings.`;
};
