import type { NodeConfigDocField } from '../node-docs.types';
import { COMMON_RUNTIME_FIELDS, dbQueryFields } from '../node-docs.constants';

export const constantDocs: NodeConfigDocField[] = [
  {
    path: 'constant.valueType',
    description:
      'How to interpret the stored value: string/number/boolean/json.',
    defaultValue: 'string',
  },
  {
    path: 'constant.value',
    description:
      'The literal value to emit (for json, this should be JSON text).',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const mathDocs: NodeConfigDocField[] = [
  {
    path: 'math.operation',
    description:
      'Numeric operation to apply: add/subtract/multiply/divide/round/ceil/floor.',
    defaultValue: 'add',
  },
  {
    path: 'math.operand',
    description:
      'Number used by the operation (ignored for round/ceil/floor).',
    defaultValue: '0',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const templateDocs: NodeConfigDocField[] = [
  {
    path: 'template.template',
    description:
      'Template used to generate a prompt string from incoming ports ({{bundle}}, {{context}}, etc).',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const bundleDocs: NodeConfigDocField[] = [
  {
    path: 'bundle.includePorts',
    description:
      'Optional allowlist: only these input port names are included in the emitted bundle.',
    defaultValue: 'undefined (all inputs)',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const gateDocs: NodeConfigDocField[] = [
  {
    path: 'gate.mode',
    description:
      'block = stop downstream when valid is false; pass = always pass but preserve valid/errors.',
    defaultValue: 'block',
  },
  {
    path: 'gate.failMessage',
    description:
      'Optional message to display/log when blocking.',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const compareDocs: NodeConfigDocField[] = [
  {
    path: 'compare.operator',
    description:
      'Comparison operator (eq/neq/gt/gte/lt/lte/contains/startsWith/endsWith/isEmpty/notEmpty).',
    defaultValue: 'eq',
  },
  {
    path: 'compare.compareTo',
    description:
      'String to compare against (converted based on operator and input value).',
    defaultValue: '""',
  },
  {
    path: 'compare.caseSensitive',
    description:
      'When comparing strings, whether case matters.',
    defaultValue: 'false',
  },
  {
    path: 'compare.message',
    description:
      'Optional error message to emit when valid is false.',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const routerDocs: NodeConfigDocField[] = [
  {
    path: 'router.mode',
    description:
      'valid routes on valid/errors; value routes on a value input.',
    defaultValue: 'value',
  },
  {
    path: 'router.matchMode',
    description:
      'truthy/falsy/equals/contains',
    defaultValue: 'truthy',
  },
  {
    path: 'router.compareTo',
    description:
      'Used by equals/contains modes.',
    defaultValue: '""',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const delayDocs: NodeConfigDocField[] = [
  {
    path: 'delay.ms',
    description: 'Delay duration in milliseconds.',
    defaultValue: '500',
  },
  ...COMMON_RUNTIME_FIELDS,
];

export const pollDocs: NodeConfigDocField[] = [
  {
    path: 'poll.mode',
    description: 'job = poll AI job status; database = poll database query.',
    defaultValue: 'job',
  },
  {
    path: 'poll.intervalMs',
    description: 'Poll frequency.',
    defaultValue: '2000',
  },
  {
    path: 'poll.maxAttempts',
    description: 'Maximum retry limit before failing.',
    defaultValue: '30',
  },
  ...dbQueryFields('poll.dbQuery'),
  {
    path: 'poll.successPath',
    description: 'JSON path in result to check for completion.',
    defaultValue: '"status"',
  },
  {
    path: 'poll.successOperator',
    description: 'equals/not_equals/contains/in.',
    defaultValue: '"equals"',
  },
  {
    path: 'poll.successValue',
    description: 'Value that indicates success (string/number).',
    defaultValue: '"completed"',
  },
  {
    path: 'poll.resultPath',
    description: 'JSON path to the actual data to emit on result port.',
    defaultValue: '"result"',
  },
  ...COMMON_RUNTIME_FIELDS,
];
