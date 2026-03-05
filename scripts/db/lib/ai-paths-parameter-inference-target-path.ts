import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';

export const CANONICAL_PARAMETER_INFERENCE_TARGET_PATH = 'parameters';

const LEGACY_PARAMETER_INFERENCE_TARGET_PATH_ALIASES = new Set<string>([
  'simpleparameters',
  '__translation_parameters_payload__',
]);

export type ParameterInferenceTargetPathUpdateReason =
  | 'alias_target_path'
  | 'enabled_guard_missing_target_path';

export type ParameterInferenceTargetPathIssueReason = 'unknown_target_path';

export type ParameterInferenceTargetPathNodeUpdate = {
  nodeId: string;
  from: string | null;
  to: string;
  reason: ParameterInferenceTargetPathUpdateReason;
};

export type ParameterInferenceTargetPathNodeIssue = {
  nodeId: string;
  targetPath: string | null;
  reason: ParameterInferenceTargetPathIssueReason;
};

export type ParameterInferenceTargetPathRewriteResult = {
  config: PathConfig;
  changed: boolean;
  updates: ParameterInferenceTargetPathNodeUpdate[];
  issues: ParameterInferenceTargetPathNodeIssue[];
};

const normalizeTargetPath = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isKnownAliasTargetPath = (value: string): boolean =>
  LEGACY_PARAMETER_INFERENCE_TARGET_PATH_ALIASES.has(value.toLowerCase());

const rewriteDatabaseNodeParameterInferenceTargetPath = (
  node: AiNode
): {
  node: AiNode;
  changed: boolean;
  updates: ParameterInferenceTargetPathNodeUpdate[];
  issues: ParameterInferenceTargetPathNodeIssue[];
} => {
  if (node.type !== 'database') {
    return { node, changed: false, updates: [], issues: [] };
  }
  if (!node.config || typeof node.config !== 'object') {
    return { node, changed: false, updates: [], issues: [] };
  }

  const databaseConfig = node.config.database;
  if (!databaseConfig || typeof databaseConfig !== 'object' || Array.isArray(databaseConfig)) {
    return { node, changed: false, updates: [], issues: [] };
  }

  const guard =
    databaseConfig.parameterInferenceGuard &&
    typeof databaseConfig.parameterInferenceGuard === 'object' &&
    !Array.isArray(databaseConfig.parameterInferenceGuard)
      ? databaseConfig.parameterInferenceGuard
      : null;

  if (!guard) {
    return { node, changed: false, updates: [], issues: [] };
  }

  const targetPath = normalizeTargetPath(guard.targetPath);
  const enabled = guard.enabled === true;
  if (targetPath === CANONICAL_PARAMETER_INFERENCE_TARGET_PATH) {
    return { node, changed: false, updates: [], issues: [] };
  }

  if (!targetPath) {
    if (!enabled) {
      return { node, changed: false, updates: [], issues: [] };
    }
    return {
      changed: true,
      node: {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            parameterInferenceGuard: {
              ...guard,
              targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
            },
          },
        },
      },
      updates: [
        {
          nodeId: node.id,
          from: null,
          to: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
          reason: 'enabled_guard_missing_target_path',
        },
      ],
      issues: [],
    };
  }

  if (isKnownAliasTargetPath(targetPath)) {
    return {
      changed: true,
      node: {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            parameterInferenceGuard: {
              ...guard,
              targetPath: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
            },
          },
        },
      },
      updates: [
        {
          nodeId: node.id,
          from: targetPath,
          to: CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
          reason: 'alias_target_path',
        },
      ],
      issues: [],
    };
  }

  return {
    node,
    changed: false,
    updates: [],
    issues: [
      {
        nodeId: node.id,
        targetPath,
        reason: 'unknown_target_path',
      },
    ],
  };
};

export const rewritePathConfigParameterInferenceTargetPaths = (
  config: PathConfig
): ParameterInferenceTargetPathRewriteResult => {
  const updates: ParameterInferenceTargetPathNodeUpdate[] = [];
  const issues: ParameterInferenceTargetPathNodeIssue[] = [];
  let changed = false;

  const nextNodes = (Array.isArray(config.nodes) ? config.nodes : []).map((node: AiNode): AiNode => {
    const rewrite = rewriteDatabaseNodeParameterInferenceTargetPath(node);
    if (rewrite.changed) {
      changed = true;
    }
    if (rewrite.updates.length > 0) {
      updates.push(...rewrite.updates);
    }
    if (rewrite.issues.length > 0) {
      issues.push(...rewrite.issues);
    }
    return rewrite.node;
  });

  if (!changed) {
    return {
      config,
      changed: false,
      updates,
      issues,
    };
  }

  return {
    config: {
      ...config,
      nodes: nextNodes,
    },
    changed: true,
    updates,
    issues,
  };
};
