import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

export const handleSwitchNode: NodeHandler = ({
  node,
  nodeInputs,
  prevOutputs,
}: NodeHandlerContext): RuntimePortValues => {
  if (node.type !== 'switch') return prevOutputs;

  const config = node.config?.['switch'];
  const inputPort = (config?.inputPort?.trim()) || 'value';
  const cases = config?.cases ?? [];

  const rawValue = nodeInputs[inputPort];
  const valueStr = rawValue == null ? '' : String(rawValue);

  let selectedCaseId: string | null = null;
  for (const c of cases) {
    if (!c) continue;
    if (String(c.matchValue ?? '') === valueStr) {
      selectedCaseId = c.id;
      break;
    }
  }

  if (!selectedCaseId && config?.defaultCaseId) {
    selectedCaseId = config.defaultCaseId;
  }

  return {
    value: rawValue,
    caseId: selectedCaseId,
    matched: selectedCaseId !== null,
  };
};

