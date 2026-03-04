import { Edge } from '@/shared/contracts/ai-paths';
import { RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import { appendInputValue, getPortDataTypes, isValueCompatibleWithTypes } from '../utils';
import { resolveEdgeFromNodeId, resolveEdgeFromPort, resolveEdgeToPort } from './engine-utils';

export function collectNodeInputs(
  nodeId: string,
  currentOutputs: Record<string, RuntimePortValues>,
  incomingEdgesByNode: Map<string, Edge[]>
): RuntimePortValues {
  const incoming = incomingEdgesByNode.get(nodeId) ?? [];
  if (incoming.length === 0) return {};
  const collected: RuntimePortValues = {};
  incoming.forEach((edge: Edge) => {
    const fromNodeId = resolveEdgeFromNodeId(edge);
    if (!fromNodeId) return;
    const fromOutput = currentOutputs[fromNodeId];
    const fromPort = resolveEdgeFromPort(edge);
    const toPort = resolveEdgeToPort(edge);
    if (!fromOutput || !fromPort || !toPort) return;
    const value = fromOutput[fromPort];
    if (value === undefined) return;
    const expectedTypes = getPortDataTypes(toPort);
    if (!isValueCompatibleWithTypes(value, expectedTypes)) return;
    const existing = collected[toPort];
    collected[toPort] = appendInputValue(existing, value);
  });
  return collected;
}
