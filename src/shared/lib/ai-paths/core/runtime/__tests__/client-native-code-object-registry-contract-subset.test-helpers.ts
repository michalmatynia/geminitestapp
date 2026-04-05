import { expect } from 'vitest';

import { evaluateGraphClient } from '../engine-client';

type EvaluateClientGraphInput = Parameters<typeof evaluateGraphClient>[0];

type EdgeInput = {
  from: string;
  fromPort: string;
  id: string;
  kind: 'signal' | 'value';
  to: string;
  toPort: string;
};

export const createGraphEdge = ({
  from,
  fromPort,
  id,
  kind,
  to,
  toPort,
}: EdgeInput): EvaluateClientGraphInput['edges'][number] => ({
  id,
  from,
  to,
  fromPort,
  toPort,
  kind,
});

export const createValueEdge = (
  input: Omit<EdgeInput, 'kind'>
): EvaluateClientGraphInput['edges'][number] =>
  createGraphEdge({
    ...input,
    kind: 'value',
  });

export const createSignalEdge = (
  input: Omit<EdgeInput, 'kind'>
): EvaluateClientGraphInput['edges'][number] =>
  createGraphEdge({
    ...input,
    kind: 'signal',
  });

export const evaluateClientGraphForTest = (
  input: Omit<EvaluateClientGraphInput, 'reportAiPathsError'>
) =>
  evaluateGraphClient({
    ...input,
    reportAiPathsError: (): void => {},
  });

export const expectBlockedNodeOutput = ({
  blockedReason,
  nodeId,
  result,
  waitingOnPorts,
}: {
  blockedReason: string;
  nodeId: string;
  result: Awaited<ReturnType<typeof evaluateGraphClient>>;
  waitingOnPorts: string[];
}): void => {
  expect(result.outputs?.[nodeId]?.['status']).toBe('blocked');
  expect(result.outputs?.[nodeId]?.['blockedReason']).toBe(blockedReason);
  expect(result.outputs?.[nodeId]?.['waitingOnPorts']).toEqual(waitingOnPorts);
};

export const expectSkippedNodeOutput = ({
  bundle,
  nodeId,
  result,
  skipReason,
}: {
  bundle?: Record<string, unknown>;
  nodeId: string;
  result: Awaited<ReturnType<typeof evaluateGraphClient>>;
  skipReason: string;
}): void => {
  expect(result.outputs?.[nodeId]?.['status']).toBe('skipped');
  expect(result.outputs?.[nodeId]?.['skipReason']).toBe(skipReason);
  if (bundle) {
    expect(result.outputs?.[nodeId]?.['bundle']).toMatchObject(bundle);
  }
};
