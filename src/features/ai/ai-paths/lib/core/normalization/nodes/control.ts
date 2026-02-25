import {
  type AiNode,
} from '@/shared/contracts/ai-paths';
import {
  DEFAULT_DB_QUERY,
  DELAY_INPUT_PORTS,
  DELAY_OUTPUT_PORTS,
  POLL_INPUT_PORTS,
  POLL_OUTPUT_PORTS,
  ROUTER_INPUT_PORTS,
  ROUTER_OUTPUT_PORTS,
} from '../../constants';
import {
  ensureUniquePorts,
} from '../../utils';

export const normalizeRouterNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], ROUTER_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], ROUTER_OUTPUT_PORTS),
    config: {
      ...node.config,
      router: {
        mode: node.config?.router?.mode ?? 'valid',
        matchMode: node.config?.router?.matchMode ?? 'truthy',
        compareTo: node.config?.router?.compareTo ?? '',
      },
    },
  };
};

export const normalizeDelayNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], DELAY_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], DELAY_OUTPUT_PORTS),
    config: {
      ...node.config,
      delay: {
        ms: node.config?.delay?.ms ?? 300,
      },
    },
  };
};

export const normalizePollNode = (node: AiNode): AiNode => {
  const pollConfig = node.config?.poll;
  const pollQuery = {
    ...DEFAULT_DB_QUERY,
    ...(pollConfig?.dbQuery ?? {}),
  };
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], POLL_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], POLL_OUTPUT_PORTS),
    config: {
      ...node.config,
      poll: {
        intervalMs: pollConfig?.intervalMs ?? 2000,
        maxAttempts: pollConfig?.maxAttempts ?? 30,
        mode: pollConfig?.mode ?? 'job',
        dbQuery: pollQuery,
        successPath: pollConfig?.successPath ?? 'status',
        successOperator: pollConfig?.successOperator ?? 'equals',
        successValue: pollConfig?.successValue ?? 'completed',
        resultPath: pollConfig?.resultPath ?? 'result',
      },
    },
  };
};
