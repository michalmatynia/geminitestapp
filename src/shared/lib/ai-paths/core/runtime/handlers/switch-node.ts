import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import type { SwitchConfig } from '@/shared/contracts/ai-paths';

const resolveSwitchInputPort = (config: SwitchConfig | undefined): string =>
  config?.inputPort?.trim() || 'value';

const findMatchingSwitchCaseId = (
  config: SwitchConfig | undefined,
  valueStr: string
): string | null => {
  for (const candidate of config?.cases ?? []) {
    if (!candidate) continue;
    if (String(candidate.matchValue ?? '') === valueStr) {
      return candidate.id;
    }
  }
  return null;
};

const resolveSelectedSwitchCaseId = (
  config: SwitchConfig | undefined,
  valueStr: string
): string | null => findMatchingSwitchCaseId(config, valueStr) ?? config?.defaultCaseId ?? null;

export const handleSwitchNode: NodeHandler = ({
  node,
  nodeInputs,
  prevOutputs,
}: NodeHandlerContext): RuntimePortValues => {
  if (node.type !== 'switch') return prevOutputs;

  const config = node.config?.['switch'];
  const inputPort = resolveSwitchInputPort(config);
  const rawValue = nodeInputs[inputPort];
  const valueStr = rawValue == null ? '' : String(rawValue);
  const selectedCaseId = resolveSelectedSwitchCaseId(config, valueStr);

  return {
    value: rawValue,
    caseId: selectedCaseId,
    matched: selectedCaseId !== null,
  };
};
