import React from 'react';

import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import type { AiNode, Edge, PortDataType } from '@/shared/contracts/ai-paths';
import {
  arePortTypesCompatible,
  formatPortDataTypes,
  formatRuntimeValue,
  getPortDataTypes,
  getValueTypeLabel,
  isValueCompatibleWithTypes,
} from '@/shared/lib/ai-paths/core/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';



type ConnectionTypeMismatch = {
  fromNode?: AiNode | null;
  toNode?: AiNode | null;
  fromPort: string;
  toPort: string;
  fromTypes: PortDataType[];
  toTypes: PortDataType[];
};

export type ConnectorInfo = {
  direction: 'input' | 'output';
  nodeId: string;
  port: string;
  expectedTypes: PortDataType[];
  expectedLabel: string;
  rawValue: unknown;
  value: unknown;
  isHistory: boolean;
  historyLength: number;
  actualType: string | null;
  runtimeMismatch: boolean;
  connectionMismatches: ConnectionTypeMismatch[];
  hasMismatch: boolean;
  nodeInputs: Record<string, unknown> | undefined;
  nodeOutputs: Record<string, unknown> | undefined;
};

type BuildConnectorInfoInput = {
  direction: 'input' | 'output';
  nodeId: string;
  port: string;
  edges: Edge[];
  nodeById: Map<string, AiNode>;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
  getNodeRuntimeData: (nodeId: string) => {
    inputs: Record<string, unknown> | undefined;
    outputs: Record<string, unknown> | undefined;
  };
};

const formatConnectorValue = (value: unknown): string => {
  if (value === undefined) return 'No data yet.';
  if (value === null) return 'null';
  const formatted = typeof value === 'string' ? value : formatRuntimeValue(value);
  if (formatted.length > 1200) return `${formatted.slice(0, 1200)}...`;
  return formatted;
};

const stringifyForDiff = (value: unknown): string => {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    logClientError(error);
    return '[Complex Object]';
  }
};

const buildDiffLines = (
  prev: string,
  next: string,
  limit: number = 120
): { lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>; truncated: boolean } => {
  const prevLines = prev.split('\n');
  const nextLines = next.split('\n');
  const max = Math.max(prevLines.length, nextLines.length);
  const lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
  let truncated = false;
  for (let index = 0; index < max; index += 1) {
    const prevLine = prevLines[index];
    const nextLine = nextLines[index];
    if (prevLine === nextLine) {
      if (prevLine !== undefined) {
        lines.push({ type: 'same', text: prevLine });
      }
    } else {
      if (prevLine !== undefined) {
        lines.push({ type: 'remove', text: prevLine });
      }
      if (nextLine !== undefined) {
        lines.push({ type: 'add', text: nextLine });
      }
    }
    if (lines.length >= limit) {
      truncated = true;
      break;
    }
  }
  return { lines, truncated };
};

const getConnectionMismatches = (
  direction: 'input' | 'output',
  nodeId: string,
  port: string,
  edges: Edge[],
  nodeById: Map<string, AiNode>
): ConnectionTypeMismatch[] => {
  const relevantEdges =
    direction === 'input'
      ? edges.filter((edge) => edge.to === nodeId && edge.toPort === port)
      : edges.filter((edge) => edge.from === nodeId && edge.fromPort === port);
  return relevantEdges.flatMap((edge) => {
    if (!edge.fromPort || !edge.toPort) return [];
    const fromTypes = getPortDataTypes(edge.fromPort);
    const toTypes = getPortDataTypes(edge.toPort);
    if (arePortTypesCompatible(fromTypes, toTypes)) return [];
    return [
      {
        fromNode: edge.from ? (nodeById.get(edge.from) ?? null) : null,
        toNode: edge.to ? (nodeById.get(edge.to) ?? null) : null,
        fromPort: edge.fromPort,
        toPort: edge.toPort,
        fromTypes,
        toTypes,
      },
    ];
  });
};

export const buildConnectorInfo = ({
  direction,
  nodeId,
  port,
  edges,
  nodeById,
  getPortValue,
  getNodeRuntimeData,
}: BuildConnectorInfoInput): ConnectorInfo => {
  const nodeRuntimeData = getNodeRuntimeData(nodeId);
  const expectedTypes = getPortDataTypes(port);
  const rawValue = getPortValue(direction, nodeId, port);
  const treatArrayAsHistory =
    Array.isArray(rawValue) &&
    !expectedTypes.includes('array') &&
    !expectedTypes.includes('image') &&
    !expectedTypes.includes('any') &&
    !expectedTypes.includes('json');
  const history = treatArrayAsHistory ? (rawValue as unknown[]) : null;
  const value = history ? history[history.length - 1] : rawValue;
  const actualType = value !== undefined ? getValueTypeLabel(value) : null;
  const runtimeMismatch =
    value !== undefined && value !== null
      ? !isValueCompatibleWithTypes(value, expectedTypes)
      : false;
  const connectionMismatches = getConnectionMismatches(direction, nodeId, port, edges, nodeById);
  const hasMismatch = runtimeMismatch || connectionMismatches.length > 0;
  return {
    direction,
    nodeId,
    port,
    expectedTypes,
    expectedLabel: formatPortDataTypes(expectedTypes),
    rawValue,
    value,
    isHistory: Boolean(history),
    historyLength: history ? history.length : 0,
    actualType,
    runtimeMismatch,
    connectionMismatches,
    hasMismatch,
    nodeInputs: nodeRuntimeData.inputs,
    nodeOutputs: nodeRuntimeData.outputs,
  };
};

export const renderConnectorTooltip = (info: ConnectorInfo): React.JSX.Element => {
  const label = info.direction === 'input' ? 'Input' : 'Output';
  const showNodeInputData = info.direction === 'input';
  const showNodeOutputData = info.direction === 'output';
  const diff =
    info.isHistory && Array.isArray(info.rawValue) && info.rawValue.length > 1
      ? buildDiffLines(
        stringifyForDiff(info.rawValue[info.rawValue.length - 2]),
        stringifyForDiff(info.rawValue[info.rawValue.length - 1])
      )
      : null;
  return (
    <div className='space-y-1'>
      <div className='text-[11px] text-gray-400'>
        {label}: {formatPortLabel(info.port)}
      </div>
      <div className='text-[10px] text-gray-400'>
        Data type: <span className='text-gray-200'>{info.expectedLabel}</span>
      </div>
      {info.actualType ? (
        <div className={`text-[10px] ${info.runtimeMismatch ? 'text-rose-300' : 'text-gray-400'}`}>
          Actual: {info.actualType}
        </div>
      ) : null}
      {info.isHistory ? (
        <div className='text-[10px] text-amber-200'>
          {info.historyLength > 1 ? `History (${info.historyLength})` : 'Single value'}
        </div>
      ) : null}
      {info.runtimeMismatch ? (
        <div className='text-[10px] text-rose-300'>
          Type mismatch (expected {info.expectedLabel})
        </div>
      ) : null}
      {info.connectionMismatches.length > 0 ? (
        <div className='space-y-1 text-[10px] text-rose-300'>
          {info.connectionMismatches.map((mismatch, index) => {
            const fromLabel = mismatch.fromNode?.title ?? mismatch.fromNode?.id ?? 'unknown';
            const toLabel = mismatch.toNode?.title ?? mismatch.toNode?.id ?? 'unknown';
            return (
              <div key={`${mismatch.fromPort}-${mismatch.toPort}-${index}`}>
                Connection mismatch: {fromLabel}.{formatPortLabel(mismatch.fromPort)} (
                {formatPortDataTypes(mismatch.fromTypes)}) {'->'} {toLabel}.
                {formatPortLabel(mismatch.toPort)} ({formatPortDataTypes(mismatch.toTypes)})
              </div>
            );
          })}
        </div>
      ) : null}
      <pre className='mt-1 max-h-56 overflow-auto whitespace-pre text-[11px] text-gray-200'>
        {formatConnectorValue(info.value)}
      </pre>
      {showNodeInputData ? (
        <div className='mt-2 border-t border-white/10 pt-2'>
          <div className='text-[10px] text-gray-400'>Node input data:</div>
          <pre className='mt-1 max-h-28 overflow-auto whitespace-pre text-[10px] text-gray-300'>
            {formatConnectorValue(info.nodeInputs)}
          </pre>
        </div>
      ) : null}
      {showNodeOutputData ? (
        <div className='mt-2 border-t border-white/10 pt-2'>
          <div className='text-[10px] text-gray-400'>Data passed through node (outputs):</div>
          <pre className='mt-1 max-h-28 overflow-auto whitespace-pre text-[10px] text-gray-300'>
            {formatConnectorValue(info.nodeOutputs)}
          </pre>
        </div>
      ) : null}
      <div className='text-[10px] text-gray-500'>Right-click to disconnect. Drag to reconnect.</div>
      {diff ? (
        <div className='mt-2'>
          <div className='text-[10px] text-gray-400'>Diff (last two passes)</div>
          <div className='mt-1 max-h-40 overflow-auto rounded bg-black/50 p-2 font-mono text-[10px] leading-relaxed'>
            {diff.lines.map((line, index) => {
              const prefix = line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  ';
              const colorClass =
                line.type === 'add'
                  ? 'text-emerald-300'
                  : line.type === 'remove'
                    ? 'text-rose-300'
                    : 'text-gray-300';
              return (
                <div key={`${line.type}-${index}`} className={`whitespace-pre ${colorClass}`}>
                  {prefix}
                  {line.text}
                </div>
              );
            })}
            {diff.truncated ? <div className='mt-1 text-gray-500'>Diff truncated...</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
