import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { explodePromptText } from './parser';
import { normalizeLearningText } from './template-learning';

import type {
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderSegment,
  PromptExploderRuntimeRuleProfile,
  SegmentSelectionStrategy,
} from '@/shared/contracts/prompt-exploder';
import type { PromptExploderRuntimeValidationScope } from '@/shared/contracts/prompt-exploder';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeApprovals = (value: unknown): number => {
  if (typeof value === 'number') return value;
  return 0;
};

export const filterTemplatesForRuntime = (
  templates: PromptExploderLearnedTemplate[],
  options: { minApprovalsForMatching: number; maxTemplates: number }
): PromptExploderLearnedTemplate[] => {
  const minApprovals = clampNumber(Math.floor(options.minApprovalsForMatching), 1, 20);
  const maxTemplates = clampNumber(Math.floor(options.maxTemplates), 50, 5000);
  const sorted = [...templates].sort((left, right) => {
    const leftApprovals = normalizeApprovals(left.approvals);
    const rightApprovals = normalizeApprovals(right.approvals);
    if (rightApprovals !== leftApprovals) {
      return rightApprovals - leftApprovals;
    }
    const leftUpdated = left.updatedAt || '';
    const rightUpdated = right.updatedAt || '';
    return rightUpdated.localeCompare(leftUpdated);
  });
  return sorted
    .filter(
      (template) =>
        template.state === 'active' && normalizeApprovals(template.approvals) >= minApprovals
    )
    .slice(0, maxTemplates);
};

export const buildRuntimeRulesForReexplode = (args: {
  runtimeValidationRules: PromptValidationRule[];
  runtimeRuleProfile: PromptExploderRuntimeRuleProfile;
  appliedRules: PromptValidationRule[];
}): PromptValidationRule[] => {
  const appliedRuleIds = new Set(args.appliedRules.map((rule) => rule.id));
  const nextRuntimeRulesBase = args.runtimeValidationRules.filter(
    (rule) => !appliedRuleIds.has(rule.id)
  );
  return args.runtimeRuleProfile === 'pattern_pack'
    ? nextRuntimeRulesBase
    : [...nextRuntimeRulesBase, ...args.appliedRules];
};

export const buildRuntimeTemplatesForReexplode = (args: {
  useUpdatedTemplates: boolean;
  runtimeLearnedTemplates: PromptExploderLearnedTemplate[];
  nextTemplates: PromptExploderLearnedTemplate[];
  learningEnabled: boolean;
  minApprovalsForMatching: number;
  maxTemplates: number;
}): PromptExploderLearnedTemplate[] => {
  if (!args.useUpdatedTemplates) {
    return args.runtimeLearnedTemplates;
  }
  if (!args.learningEnabled) {
    return [];
  }
  return filterTemplatesForRuntime(args.nextTemplates, {
    minApprovalsForMatching: args.minApprovalsForMatching,
    maxTemplates: args.maxTemplates,
  });
};

export const reexplodePromptWithRuntime = (args: {
  prompt: string;
  validationRules: PromptValidationRule[];
  learnedTemplates: PromptExploderLearnedTemplate[];
  similarityThreshold: number;
  validationScope?: PromptExploderRuntimeValidationScope;
}): PromptExploderDocument => {
  return explodePromptText({
    prompt: args.prompt,
    validationRules: args.validationRules,
    learnedTemplates: args.learnedTemplates,
    similarityThreshold: args.similarityThreshold,
    ...(args.validationScope ? { validationScope: args.validationScope } : {}),
  });
};

export const resolveSegmentIdAfterReexplode = (args: {
  document: PromptExploderDocument;
  strategy: SegmentSelectionStrategy;
}): string | null => {
  if (typeof args.strategy === 'object' && args.strategy !== null && 'kind' in args.strategy) {
    if (args.strategy.kind === 'match_title') {
      const targetTitle = args.strategy.title;
      const matched = args.document.segments.find(
        (segment: PromptExploderSegment) =>
          normalizeLearningText(segment.title || '') === normalizeLearningText(targetTitle)
      );
      return matched?.id ?? args.document.segments[0]?.id ?? null;
    }
    if (args.strategy.kind === 'preserve_id') {
      const { previousId } = args.strategy;
      if (!previousId) {
        return args.document.segments[0]?.id ?? null;
      }
      return args.document.segments.some(
        (segment: PromptExploderSegment) => segment.id === previousId
      )
        ? previousId
        : args.document.segments[0]?.id ?? (null as string | null);
    }
  }
  return args.document.segments[0]?.id ?? null;
};
