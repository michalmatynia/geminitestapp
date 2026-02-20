import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

export type DependencyRiskSeverity = 'warning' | 'error';

export type DependencyRisk = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  severity: DependencyRiskSeverity;
  category: string;
  message: string;
  recommendation: string;
};

export type DependencyReport = {
  risks: DependencyRisk[];
  warnings: number;
  errors: number;
  strictReady: boolean;
};

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getIncomingPorts = (nodeId: string, edges: Edge[]): Set<string> => {
  const ports = new Set<string>();
  edges.forEach((edge: Edge): void => {
    const targetNodeId =
      normalizeNonEmptyString(edge.to) ??
      normalizeNonEmptyString(edge.target);
    if (targetNodeId !== nodeId) return;
    const toPort =
      normalizeNonEmptyString(edge.toPort) ??
      normalizeNonEmptyString(edge.targetHandle);
    if (!toPort) return;
    ports.add(toPort);
  });
  return ports;
};

const hasAnyPort = (ports: Set<string>, candidates: string[]): boolean =>
  candidates.some((candidate: string): boolean => ports.has(candidate));

const pushRisk = (
  risks: DependencyRisk[],
  node: AiNode,
  category: string,
  severity: DependencyRiskSeverity,
  message: string,
  recommendation: string,
): void => {
  risks.push({
    id: `${node.id}:${category}`,
    nodeId: node.id,
    nodeTitle: node.title ?? node.id,
    nodeType: node.type,
    severity,
    category,
    message,
    recommendation,
  });
};

export const inspectPathDependencies = (
  nodes: AiNode[],
  edges: Edge[],
): DependencyReport => {
  const risks: DependencyRisk[] = [];

  nodes.forEach((node: AiNode): void => {
    const incomingPorts = getIncomingPorts(node.id, edges);

    if (node.type === 'trigger') {
      if (!incomingPorts.has('context')) {
        pushRisk(
          risks,
          node,
          'trigger_context_fallback',
          'warning',
          'Trigger has no wired `context` input and may rely on runtime fallback context.',
          'Wire an explicit context source into the trigger node.',
        );
      }
      return;
    }

    if (node.type === 'parser') {
      if (!incomingPorts.has('entityJson') && !incomingPorts.has('context')) {
        pushRisk(
          risks,
          node,
          'parser_entity_fallback',
          'warning',
          'Parser has no `entityJson` or `context` input and may parse fallback entity data.',
          'Connect `entityJson` or `context` from upstream nodes.',
        );
      }
      return;
    }

    if (node.type !== 'database') return;

    const waitForInputsEnabled = node.config?.runtime?.waitForInputs === true;
    if (!waitForInputsEnabled) {
      pushRisk(
        risks,
        node,
        'database_wait_for_inputs_disabled',
        'warning',
        'Database node runs without `waitForInputs` guard and can execute on partial data.',
        'Enable `runtime.waitForInputs` in this node configuration.',
      );
    }

    const dbConfig = node.config?.database;
    const operation = dbConfig?.operation ?? 'query';

    if (operation === 'query') {
      const queryMode = dbConfig?.query?.mode ?? 'preset';
      const preset = dbConfig?.query?.preset ?? 'by_id';
      if (
        queryMode === 'preset' &&
        (preset === 'by_id' || preset === 'by_entityId' || preset === 'by_productId') &&
        !hasAnyPort(incomingPorts, ['entityId', 'productId', 'value', 'query', 'queryCallback', 'aiQuery'])
      ) {
        pushRisk(
          risks,
          node,
          'database_query_preset_without_inputs',
          'warning',
          'Preset query can fall back to implicit runtime IDs because no query/ID inputs are connected.',
          'Connect `entityId`, `productId`, `value`, or explicit query ports.',
        );
      }
      return;
    }

    if (operation === 'update' || operation === 'delete') {
      if (!hasAnyPort(incomingPorts, ['entityId', 'productId', 'value', 'context', 'bundle', 'meta'])) {
        pushRisk(
          risks,
          node,
          'database_write_missing_identity_inputs',
          'error',
          'Write operation has no connected identity inputs and may rely on hidden fallback IDs.',
          'Connect `entityId`/`productId` (or `value`) from explicit upstream outputs.',
        );
      }
    }
  });

  const warnings = risks.filter((risk: DependencyRisk): boolean => risk.severity === 'warning').length;
  const errors = risks.filter((risk: DependencyRisk): boolean => risk.severity === 'error').length;
  return {
    risks,
    warnings,
    errors,
    strictReady: errors === 0,
  };
};
