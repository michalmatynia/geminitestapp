import {
  type AiNode,
} from '@/shared/contracts/ai-paths';
import {
  PLAYWRIGHT_INPUT_PORTS,
  PLAYWRIGHT_OUTPUT_PORTS,
  VIEWER_INPUT_PORTS,
} from '../../constants';
import {
  normalizePlaywrightConfig,
} from '../../playwright/default-config';
import {
  createViewerOutputs,
  ensureUniquePorts,
} from '../../utils';

export const normalizeValidatorNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      validator: {
        requiredPaths: node.config?.validator?.requiredPaths ?? ['entity.id'],
        mode: node.config?.validator?.mode ?? 'all',
      },
    },
  };
};

export const normalizeConstantNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      constant: {
        valueType: node.config?.constant?.valueType ?? 'string',
        value: node.config?.constant?.value ?? '',
      },
    },
  };
};

export const normalizeMathNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      math: {
        operation: node.config?.math?.operation ?? 'add',
        operand: node.config?.math?.operand ?? 0,
      },
    },
  };
};

export const normalizeTemplateNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      template: {
        template:
        node.config?.template?.template ??
        'Write a summary for {{context.entity.title}}',
      },
    },
  };
};

export const normalizeBundleNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      bundle: {
        includePorts: node.config?.bundle?.includePorts ?? [],
      },
    },
  };
};

export const normalizeCompareNode = (node: AiNode): AiNode => {
  return {
    ...node,
    config: {
      ...node.config,
      compare: {
        operator: node.config?.compare?.operator ?? 'eq',
        compareTo: node.config?.compare?.compareTo ?? '',
        caseSensitive: node.config?.compare?.caseSensitive ?? false,
        message: node.config?.compare?.message ?? 'Comparison failed',
      },
    },
  };
};

export const normalizePlaywrightNode = (node: AiNode): AiNode => {
  const playwrightConfig = normalizePlaywrightConfig(node.config?.playwright);
  return {
    ...node,
    inputs: ensureUniquePorts(node.inputs ?? [], PLAYWRIGHT_INPUT_PORTS),
    outputs: ensureUniquePorts(node.outputs ?? [], PLAYWRIGHT_OUTPUT_PORTS),
    config: {
      ...node.config,
      playwright: playwrightConfig,
    },
  };
};

export const normalizeViewerNode = (node: AiNode): AiNode => {
  const normalizedInputs = ensureUniquePorts(node.inputs ?? [], VIEWER_INPUT_PORTS);
  const existingOutputs = node.config?.viewer?.outputs;
  const outputs = existingOutputs ?? {
    ...createViewerOutputs(normalizedInputs),
  };
  return {
    ...node,
    inputs: normalizedInputs,
    config: {
      ...node.config,
      viewer: {
        outputs: {
          ...createViewerOutputs(normalizedInputs),
          ...outputs,
        },
        showImagesAsJson: node.config?.viewer?.showImagesAsJson ?? false,
      },
    },
  };
};
