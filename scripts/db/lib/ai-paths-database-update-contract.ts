import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

const TEMPLATE_TOKEN_REGEX: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;
const TEMPLATE_SYSTEM_ROOT_PREFIXES = ['Date:', 'DB Provider:', 'Collection:'];
const ROOTS_REQUIRING_WIRING = new Set([
  'value',
  'result',
  'bundle',
  'context',
  'prompt',
  'query',
  'queryCallback',
  'aiQuery',
  'schema',
  'content_en',
]);

export type DatabaseUpdateContractRewriteReason =
  | 'missing_mode_defaulted_custom'
  | 'missing_mode_inferred_mapping_empty_template'
  | 'missing_mode_inferred_mapping_equivalent_template'
  | 'missing_mode_inferred_mapping_template_root_blocked'
  | 'custom_mode_switched_mapping_empty_template'
  | 'custom_mode_switched_mapping_equivalent_template'
  | 'custom_mode_switched_mapping_template_root_blocked';

export type DatabaseUpdateContractIssueReason =
  | 'mapping_mode_missing_mappings'
  | 'custom_template_root_missing_input'
  | 'custom_template_root_unwired'
  | 'mapping_source_port_missing_input'
  | 'mapping_source_port_unwired';

export type DatabaseUpdateContractNodeUpdate = {
  nodeId: string;
  fromMode: 'custom' | 'mapping' | null;
  toMode: 'custom' | 'mapping';
  reason: DatabaseUpdateContractRewriteReason;
};

export type DatabaseUpdateContractNodeIssue = {
  nodeId: string;
  mode: 'custom' | 'mapping' | null;
  reason: DatabaseUpdateContractIssueReason;
  port?: string;
  targetPath?: string;
  token?: string;
};

export type DatabaseUpdateContractRewriteResult = {
  config: PathConfig;
  changed: boolean;
  updates: DatabaseUpdateContractNodeUpdate[];
  issues: DatabaseUpdateContractNodeIssue[];
};

type NormalizedMapping = {
  targetPath: string;
  sourcePort: string;
  sourcePath: string;
};

type TemplateAssignment = {
  targetPath: string;
  token: string;
  sourcePort: string;
  sourcePath: string;
};

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeTemplateRoot = (token: string): string => {
  const rootCandidate = token.split('.')[0]?.trim() ?? '';
  return rootCandidate.replace(/\[[^\]]*\]/g, '').trim();
};

const isSystemTemplateRoot = (root: string): boolean =>
  TEMPLATE_SYSTEM_ROOT_PREFIXES.some((prefix: string): boolean => root.startsWith(prefix));

const extractTemplateTokens = (template: string): string[] => {
  const tokens = new Set<string>();
  TEMPLATE_TOKEN_REGEX.lastIndex = 0;
  let match = TEMPLATE_TOKEN_REGEX.exec(template);
  while (match) {
    const token = (match[1] ?? match[2] ?? '').trim();
    if (token.length === 0) {
      match = TEMPLATE_TOKEN_REGEX.exec(template);
      continue;
    }
    const root = normalizeTemplateRoot(token);
    if (!root || isSystemTemplateRoot(root)) {
      match = TEMPLATE_TOKEN_REGEX.exec(template);
      continue;
    }
    tokens.add(token);
    match = TEMPLATE_TOKEN_REGEX.exec(template);
  }
  return Array.from(tokens);
};

const collectIncomingPortsByNodeId = (edges: Edge[]): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  edges.forEach((edge: Edge): void => {
    const toNodeId = normalizeText(edge.to);
    const toPort = normalizeText(edge.toPort);
    if (!toNodeId || !toPort) return;
    const set = map.get(toNodeId) ?? new Set<string>();
    set.add(toPort);
    map.set(toNodeId, set);
  });
  return map;
};

const requiresWiring = (port: string): boolean => ROOTS_REQUIRING_WIRING.has(port);

const normalizeMappings = (value: unknown): NormalizedMapping[] => {
  if (!Array.isArray(value)) return [];
  const mappings: NormalizedMapping[] = [];
  value.forEach((entry: unknown): void => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const targetPath = normalizeText(record['targetPath']);
    const sourcePort = normalizeText(record['sourcePort']);
    if (!targetPath || !sourcePort) return;
    mappings.push({
      targetPath,
      sourcePort,
      sourcePath: normalizeText(record['sourcePath']),
    });
  });
  return mappings;
};

const toTokenSource = (token: string): { sourcePort: string; sourcePath: string } | null => {
  const root = normalizeTemplateRoot(token);
  if (!root || root === 'current' || isSystemTemplateRoot(root)) return null;
  const normalizedToken = token.trim();
  const nested = normalizedToken.startsWith(`${root}.`)
    ? normalizedToken.slice(root.length + 1).trim()
    : '';
  return {
    sourcePort: root,
    sourcePath: nested,
  };
};

const parsePureSetTokenAssignments = (template: string): TemplateAssignment[] | null => {
  const fullMatch = template.match(/^\s*\{\s*"\$set"\s*:\s*\{([\s\S]*)\}\s*\}\s*$/);
  if (!fullMatch?.[1]) return null;
  const setBody = fullMatch[1];
  const assignmentRegex =
    /"([^"]+)"\s*:\s*(?:"{{\s*([^}]+)\s*}}"|{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\])/g;
  const assignments: TemplateAssignment[] = [];
  let match = assignmentRegex.exec(setBody);
  while (match) {
    const targetPath = normalizeText(match[1]);
    const token = normalizeText(match[2] ?? match[3] ?? match[4]);
    if (!targetPath || !token) {
      match = assignmentRegex.exec(setBody);
      continue;
    }
    const source = toTokenSource(token);
    if (!source) {
      return null;
    }
    assignments.push({
      targetPath,
      token,
      sourcePort: source.sourcePort,
      sourcePath: source.sourcePath,
    });
    match = assignmentRegex.exec(setBody);
  }
  if (assignments.length === 0) return null;
  const stripped = setBody.replace(assignmentRegex, '').replace(/[\s,]/g, '');
  if (stripped.length > 0) return null;
  return assignments;
};

const isEquivalentMappingTemplate = (
  updateTemplate: string,
  mappings: NormalizedMapping[]
): boolean => {
  const assignments = parsePureSetTokenAssignments(updateTemplate);
  if (!assignments) return false;
  const mappingByTarget = new Map(
    mappings.map((entry: NormalizedMapping): [string, NormalizedMapping] => [entry.targetPath, entry])
  );
  return assignments.every((assignment: TemplateAssignment): boolean => {
    const mapping = mappingByTarget.get(assignment.targetPath);
    if (!mapping) return false;
    return (
      mapping.sourcePort === assignment.sourcePort &&
      normalizeText(mapping.sourcePath) === normalizeText(assignment.sourcePath)
    );
  });
};

const evaluateTemplateRoots = (args: {
  node: AiNode;
  mode: 'custom' | 'mapping' | null;
  template: string;
  incomingPorts: Set<string>;
  issues: DatabaseUpdateContractNodeIssue[];
}): { hasBlockedRoots: boolean } => {
  if (args.mode !== 'custom') {
    return { hasBlockedRoots: false };
  }
  const nodeInputs = new Set((args.node.inputs ?? []).map((port: string): string => port.trim()));
  let hasBlockedRoots = false;
  extractTemplateTokens(args.template).forEach((token: string): void => {
    const root = normalizeTemplateRoot(token);
    if (!root || root === 'current') return;
    if (!nodeInputs.has(root)) {
      hasBlockedRoots = true;
      args.issues.push({
        nodeId: args.node.id,
        mode: args.mode,
        reason: 'custom_template_root_missing_input',
        port: root,
        token,
      });
      return;
    }
    if (requiresWiring(root) && !args.incomingPorts.has(root)) {
      hasBlockedRoots = true;
      args.issues.push({
        nodeId: args.node.id,
        mode: args.mode,
        reason: 'custom_template_root_unwired',
        port: root,
        token,
      });
    }
  });
  return { hasBlockedRoots };
};

const evaluateMappings = (args: {
  node: AiNode;
  mode: 'custom' | 'mapping' | null;
  mappings: NormalizedMapping[];
  incomingPorts: Set<string>;
  issues: DatabaseUpdateContractNodeIssue[];
}): { hasViableSources: boolean } => {
  if (args.mappings.length === 0) {
    if (args.mode === 'mapping') {
      args.issues.push({
        nodeId: args.node.id,
        mode: args.mode,
        reason: 'mapping_mode_missing_mappings',
      });
    }
    return { hasViableSources: false };
  }

  const nodeInputs = new Set((args.node.inputs ?? []).map((port: string): string => port.trim()));
  let hasBlockingSource = false;
  args.mappings.forEach((mapping: NormalizedMapping): void => {
    if (!nodeInputs.has(mapping.sourcePort)) {
      hasBlockingSource = true;
      args.issues.push({
        nodeId: args.node.id,
        mode: args.mode,
        reason: 'mapping_source_port_missing_input',
        port: mapping.sourcePort,
        targetPath: mapping.targetPath,
      });
      return;
    }
    if (requiresWiring(mapping.sourcePort) && !args.incomingPorts.has(mapping.sourcePort)) {
      hasBlockingSource = true;
      args.issues.push({
        nodeId: args.node.id,
        mode: args.mode,
        reason: 'mapping_source_port_unwired',
        port: mapping.sourcePort,
        targetPath: mapping.targetPath,
      });
    }
  });

  return { hasViableSources: !hasBlockingSource };
};

const normalizeMode = (value: unknown): 'custom' | 'mapping' | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'custom' || normalized === 'mapping') return normalized;
  return null;
};

const rewriteDatabaseNodeUpdateMode = (args: {
  node: AiNode;
  incomingPorts: Set<string>;
}): {
  node: AiNode;
  changed: boolean;
  updates: DatabaseUpdateContractNodeUpdate[];
  issues: DatabaseUpdateContractNodeIssue[];
} => {
  if (args.node.type !== 'database') {
    return { node: args.node, changed: false, updates: [], issues: [] };
  }
  if (!args.node.config || typeof args.node.config !== 'object') {
    return { node: args.node, changed: false, updates: [], issues: [] };
  }
  const databaseConfig = args.node.config.database;
  if (!databaseConfig || typeof databaseConfig !== 'object' || Array.isArray(databaseConfig)) {
    return { node: args.node, changed: false, updates: [], issues: [] };
  }

  const configRecord = databaseConfig as Record<string, unknown>;
  const operation = normalizeText(configRecord['operation']).toLowerCase();
  if (operation !== 'update') {
    return { node: args.node, changed: false, updates: [], issues: [] };
  }

  const mode = normalizeMode(configRecord['updatePayloadMode']);
  const template = normalizeText(configRecord['updateTemplate']);
  const mappings = normalizeMappings(configRecord['mappings']);
  const issues: DatabaseUpdateContractNodeIssue[] = [];
  const updates: DatabaseUpdateContractNodeUpdate[] = [];
  const mappingDiagnostics = evaluateMappings({
    node: args.node,
    mode,
    mappings,
    incomingPorts: args.incomingPorts,
    issues,
  });
  const templateDiagnostics = evaluateTemplateRoots({
    node: args.node,
    mode,
    template,
    incomingPorts: args.incomingPorts,
    issues,
  });
  const equivalentTemplate = isEquivalentMappingTemplate(template, mappings);

  let nextMode: 'custom' | 'mapping' | null = mode;
  let reason: DatabaseUpdateContractRewriteReason | null = null;

  if (mode === null) {
    if (mappings.length > 0 && template.length === 0) {
      nextMode = 'mapping';
      reason = 'missing_mode_inferred_mapping_empty_template';
    } else if (mappings.length > 0 && equivalentTemplate) {
      nextMode = 'mapping';
      reason = 'missing_mode_inferred_mapping_equivalent_template';
    } else if (
      mappings.length > 0 &&
      templateDiagnostics.hasBlockedRoots &&
      mappingDiagnostics.hasViableSources
    ) {
      nextMode = 'mapping';
      reason = 'missing_mode_inferred_mapping_template_root_blocked';
    } else {
      nextMode = 'custom';
      reason = 'missing_mode_defaulted_custom';
    }
  } else if (mode === 'custom') {
    if (mappings.length > 0 && template.length === 0) {
      nextMode = 'mapping';
      reason = 'custom_mode_switched_mapping_empty_template';
    } else if (mappings.length > 0 && equivalentTemplate) {
      nextMode = 'mapping';
      reason = 'custom_mode_switched_mapping_equivalent_template';
    } else if (
      mappings.length > 0 &&
      templateDiagnostics.hasBlockedRoots &&
      mappingDiagnostics.hasViableSources
    ) {
      nextMode = 'mapping';
      reason = 'custom_mode_switched_mapping_template_root_blocked';
    }
  }

  if (!nextMode || nextMode === mode || !reason) {
    return {
      node: args.node,
      changed: false,
      updates,
      issues,
    };
  }

  updates.push({
    nodeId: args.node.id,
    fromMode: mode,
    toMode: nextMode,
    reason,
  });

  return {
    changed: true,
    node: {
      ...args.node,
      config: {
        ...args.node.config,
        database: {
          ...databaseConfig,
          updatePayloadMode: nextMode,
        },
      },
    },
    updates,
    issues,
  };
};

export const rewritePathConfigDatabaseUpdateContract = (
  config: PathConfig
): DatabaseUpdateContractRewriteResult => {
  const updates: DatabaseUpdateContractNodeUpdate[] = [];
  const issues: DatabaseUpdateContractNodeIssue[] = [];
  let changed = false;
  const incomingPortsByNodeId = collectIncomingPortsByNodeId(config.edges ?? []);

  const nextNodes = (Array.isArray(config.nodes) ? config.nodes : []).map((node: AiNode): AiNode => {
    const rewrite = rewriteDatabaseNodeUpdateMode({
      node,
      incomingPorts: incomingPortsByNodeId.get(node.id) ?? new Set<string>(),
    });
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
