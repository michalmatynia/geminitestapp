import type { PromptExploderRuntimeValidationScope } from './validation-stack';

const MAX_INFLIGHT_PER_SCOPE = 1;
const inflightByScope = new Map<PromptExploderRuntimeValidationScope, number>();

export const tryEnterPromptRuntimeScope = (
  scope: PromptExploderRuntimeValidationScope
): boolean => {
  const inflight = inflightByScope.get(scope) ?? 0;
  if (inflight >= MAX_INFLIGHT_PER_SCOPE) return false;
  inflightByScope.set(scope, inflight + 1);
  return true;
};

export const leavePromptRuntimeScope = (scope: PromptExploderRuntimeValidationScope): void => {
  const inflight = inflightByScope.get(scope) ?? 0;
  if (inflight <= 1) {
    inflightByScope.delete(scope);
    return;
  }
  inflightByScope.set(scope, inflight - 1);
};

export const getPromptRuntimeLoadSnapshot = (): {
  maxInflightPerScope: number;
  inflight: Record<string, number>;
} => {
  const inflight: Record<string, number> = {};
  for (const [scope, value] of inflightByScope.entries()) {
    inflight[scope] = value;
  }
  return {
    maxInflightPerScope: MAX_INFLIGHT_PER_SCOPE,
    inflight,
  };
};

export const resetPromptRuntimeLoadSnapshot = (): void => {
  inflightByScope.clear();
};
