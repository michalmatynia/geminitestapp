import type { NodeDefinition } from '@/shared/contracts/ai-paths';
import {
  BUNDLE_INPUT_PORTS,
  CONTEXT_INPUT_PORTS,
  FETCHER_INPUT_PORTS,
  FETCHER_OUTPUT_PORTS,
  ITERATOR_INPUT_PORTS,
  ITERATOR_OUTPUT_PORTS,
  REGEX_INPUT_PORTS,
  REGEX_OUTPUT_PORTS,
  STRING_MUTATOR_INPUT_PORTS,
  STRING_MUTATOR_OUTPUT_PORTS,
} from '../../constants';
import { buildOptionalInputContracts, buildRequiredInputContracts } from '../utils';

export const dataPalette: NodeDefinition[] = [
  {
    type: 'fetcher',
    title: 'Fetcher: Trigger Context',
    description: 'Resolve live trigger context or fetch simulated entity by ID.',
    inputs: FETCHER_INPUT_PORTS,
    outputs: FETCHER_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(FETCHER_INPUT_PORTS, ['trigger']),
    config: {
      fetcher: {
        sourceMode: 'live_context',
        entityType: 'product',
        entityId: '',
        productId: '',
      },
      runtime: {
        waitForInputs: true,
        inputContracts: buildRequiredInputContracts(FETCHER_INPUT_PORTS, ['trigger']),
      },
    },
  },
  {
    type: 'context',
    title: 'Context Filter',
    description: 'Filter incoming context payloads into scoped entity data.',
    inputs: CONTEXT_INPUT_PORTS,
    outputs: ['context', 'entityId', 'entityType', 'entityJson'],
    inputContracts: buildRequiredInputContracts(CONTEXT_INPUT_PORTS, ['context']),
  },
  {
    type: 'parser',
    title: 'JSON Parser',
    description: 'Extract fields into outputs or a single bundle.',
    inputs: ['entityJson', 'context'],
    outputs: ['productId', 'title', 'images', 'content_en'],
    inputContracts: buildOptionalInputContracts(['entityJson', 'context']),
  },
  {
    type: 'regex',
    title: 'Regex Grouper',
    description: 'Group strings with regex or extract matched fragments.',
    inputs: REGEX_INPUT_PORTS,
    outputs: REGEX_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(REGEX_INPUT_PORTS),
    config: {
      regex: {
        pattern: '',
        flags: 'g',
        mode: 'group',
        matchMode: 'first',
        groupBy: 'match',
        outputMode: 'object',
        includeUnmatched: true,
        unmatchedKey: '__unmatched__',
        splitLines: true,
        sampleText: '',
        aiPrompt:
          `You are a regex expert. Propose a JavaScript RegExp to group items in the input.

Return ONLY JSON:
{"pattern":"...","flags":"...","groupBy":"match|1|<namedGroup>"}

Input:
{{text}}`,
        aiAutoRun: false,
      },
    },
  },
  {
    type: 'iterator',
    title: 'Iterator',
    description: 'Iterate over an array and emit one item at a time (advance on callback).',
    inputs: ITERATOR_INPUT_PORTS,
    outputs: ITERATOR_OUTPUT_PORTS,
    inputContracts: buildRequiredInputContracts(ITERATOR_INPUT_PORTS, ['value']),
    config: {
      iterator: {
        autoContinue: true,
        maxSteps: 50,
      },
    },
  },
  {
    type: 'mapper',
    title: 'JSON Mapper',
    description: 'Map context to custom outputs.',
    inputs: ['context', 'result', 'bundle', 'value'],
    outputs: ['value', 'result'],
    inputContracts: buildOptionalInputContracts(['context', 'result', 'bundle', 'value']),
  },
  {
    type: 'mutator',
    title: 'Mutator',
    description: 'Mutate context values with templates.',
    inputs: ['context'],
    outputs: ['context'],
    inputContracts: buildRequiredInputContracts(['context'], ['context']),
  },
  {
    type: 'string_mutator',
    title: 'String Mutator',
    description: 'Transform text with chained string operations.',
    inputs: STRING_MUTATOR_INPUT_PORTS,
    outputs: STRING_MUTATOR_OUTPUT_PORTS,
    inputContracts: buildOptionalInputContracts(STRING_MUTATOR_INPUT_PORTS),
  },
  {
    type: 'bundle',
    title: 'Bundle',
    description: 'Cluster inputs into a single bundle output.',
    inputs: BUNDLE_INPUT_PORTS,
    outputs: ['bundle'],
    inputContracts: buildOptionalInputContracts(BUNDLE_INPUT_PORTS),
  },
  {
    type: 'template',
    title: 'Template',
    description: 'Create prompts from template strings.',
    inputs: ['template', 'context', 'value', 'result', 'bundle'],
    outputs: ['prompt'],
    inputContracts: buildOptionalInputContracts(['template', 'context', 'value', 'result', 'bundle']),
  },
  {
    type: 'function',
    title: 'Function',
    description: 'Run small JavaScript transforms over inputs.',
    inputs: ['value', 'context', 'bundle', 'result'],
    outputs: ['value'],
    inputContracts: buildOptionalInputContracts(['value', 'context', 'bundle', 'result']),
  },
  {
    type: 'state',
    title: 'State',
    description: 'Read and write named variables shared across the run.',
    inputs: ['value', 'delta'],
    outputs: ['value', 'previous', 'delta'],
    inputContracts: buildOptionalInputContracts(['value', 'delta']),
  },
  {
    type: 'constant',
    title: 'Constant',
    description: 'Emit a constant value as a signal.',
    inputs: [],
    outputs: ['value'],
  },
  {
    type: 'math',
    title: 'Math',
    description: 'Apply numeric transformation to a value.',
    inputs: ['value'],
    outputs: ['value'],
    inputContracts: {
      value: { required: true },
    },
  },
];
