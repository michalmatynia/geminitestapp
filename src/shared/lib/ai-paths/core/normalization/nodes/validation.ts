import { type AiNode } from '@/shared/contracts/ai-paths';
import { VALIDATION_PATTERN_INPUT_PORTS, VALIDATION_PATTERN_OUTPUT_PORTS } from '../../constants';
import { ensureUniquePorts } from '../../utils/graph.ports';

export const normalizeValidationPatternNode = (node: AiNode): AiNode => {
  const config = node.config?.validationPattern;
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], VALIDATION_PATTERN_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], VALIDATION_PATTERN_OUTPUT_PORTS),
    config: {
      ...node.config,
      validationPattern: {
        source: config?.source ?? 'global_stack',
        stackId: config?.stackId ?? '',
        scope: config?.scope ?? 'global',
        includeLearnedRules: config?.includeLearnedRules ?? true,
        runtimeMode: config?.runtimeMode ?? 'validate_only',
        failPolicy: config?.failPolicy ?? 'block_on_error',
        inputPort: config?.inputPort ?? 'auto',
        outputPort: config?.outputPort ?? 'value',
        maxAutofixPasses:
          typeof config?.maxAutofixPasses === 'number' && Number.isFinite(config.maxAutofixPasses)
            ? Math.max(1, Math.min(10, Math.trunc(config.maxAutofixPasses)))
            : 1,
        includeRuleIds: config?.includeRuleIds ?? [],
        localListName: config?.localListName ?? 'Path Local Validation List',
        localListDescription: config?.localListDescription ?? '',
        rules: Array.isArray(config?.rules) ? config.rules : [],
        learnedRules: Array.isArray(config?.learnedRules) ? config.learnedRules : [],
      },
    },
  };
};
