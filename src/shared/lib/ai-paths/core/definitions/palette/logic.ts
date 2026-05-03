import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  LOGICAL_CONDITION_INPUT_PORTS,
  LOGICAL_CONDITION_OUTPUT_PORTS,
  ROUTER_INPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
  VALIDATION_PATTERN_INPUT_PORTS,
  VALIDATION_PATTERN_OUTPUT_PORTS,
} from '../../constants';
import { buildOptionalInputContracts, buildRequiredInputContracts } from '../utils';

export const logicPalette: NodeDefinition[] = [
  {
    type: 'logical_condition',
    title: 'Logical Condition',
    description: 'Evaluate multiple conditions with AND/OR combinator.',
    inputs: LOGICAL_CONDITION_INPUT_PORTS,
    outputs: LOGICAL_CONDITION_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(LOGICAL_CONDITION_INPUT_PORTS),
    config: {
      logicalCondition: {
        combinator: 'and' as const,
        conditions: [],
      },
    },
  },
  {
    type: 'router',
    title: 'Router',
    description: 'Route payloads based on a condition.',
    inputs: ROUTER_INPUT_PORTS,
    outputs: ROUTER_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(ROUTER_INPUT_PORTS),
  },
  {
    type: 'switch',
    title: 'Switch',
    description: 'Branch on a value and label the active route.',
    inputs: ['value'],
    outputs: ['value', 'caseId', 'matched'],
    inputContracts: buildOptionalInputContracts(['value']),
  },
  {
    type: 'gate',
    title: 'Gate',
    description: 'Allow context through when valid is true.',
    inputs: ['context', 'valid', 'errors'],
    outputs: ['context', 'valid', 'errors'],
    inputContracts: buildRequiredInputContracts(['context', 'valid', 'errors'], ['valid']),
  },
  {
    type: 'compare',
    title: 'Compare',
    description: 'Compare a value and emit valid/errors.',
    inputs: ['value'],
    outputs: ['value', 'valid', 'errors'],
    inputContracts: {
      value: { required: true },
    },
  },
  {
    type: 'validator',
    title: 'Validator',
    description: 'Validate required fields.',
    inputs: ['context'],
    outputs: ['context', 'valid', 'errors'],
    inputContracts: buildRequiredInputContracts(['context'], ['context']),
  },
  {
    type: 'validation_pattern',
    title: 'Validation Pattern',
    description: 'Run ordered validation patterns from a stack or a path-local rule list.',
    inputs: VALIDATION_PATTERN_INPUT_PORTS,
    outputs: VALIDATION_PATTERN_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(VALIDATION_PATTERN_INPUT_PORTS),
    config: {
      validationPattern: {
        source: 'global_stack',
        stackId: '',
        scope: 'global',
        includeLearnedRules: true,
        runtimeMode: 'validate_only',
        failPolicy: 'block_on_error',
        inputPort: 'auto',
        outputPort: 'value',
        maxAutofixPasses: 1,
        includeRuleIds: [],
        localListName: 'Path Local Validation List',
        localListDescription: '',
        rules: [],
        learnedRules: [],
      },
    },
  },
];
