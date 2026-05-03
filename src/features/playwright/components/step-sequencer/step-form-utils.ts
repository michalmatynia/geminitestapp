
import type { PlaywrightStep } from '@/shared/contracts/playwright-steps';

export type StepDraft = Partial<PlaywrightStep> & {
  selectorNamespace?: string | null;
  selectorKey?: string | null;
  selectorProfile?: string | null;
};

export function buildEmpty(): StepDraft {
  return {
    name: '',
    description: null,
    type: 'click',
    selector: null,
    value: null,
    url: null,
    key: null,
    timeout: null,
    script: null,
    inputBindings: {},
    websiteId: null,
    flowId: null,
    tags: [],
    sortOrder: 0,
    aiSystemPrompt: null,
    aiInputSource: 'screenshot',
    aiGoal: null,
    aiMaxIterations: 3,
    aiLoopEvaluatorInputSource: null,
  };
}
