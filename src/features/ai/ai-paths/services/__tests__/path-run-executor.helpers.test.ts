import { describe, expect, it } from 'vitest';

import { EMPTY_RUNTIME_STATE, parseRuntimeState } from '../path-run-executor.helpers';

describe('parseRuntimeState', () => {
  it('returns empty runtime state for empty input', () => {
    expect(parseRuntimeState(null)).toEqual(EMPTY_RUNTIME_STATE);
  });

  it('rejects legacy runtime identity fields in non-empty payloads', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [],
          inputs: {},
          outputs: {},
          runId: 'legacy-run-id',
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects legacy runtime identity fields nested in runtime events', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [
            {
              id: 'evt-1',
              timestamp: '2026-03-03T10:00:00.000Z',
              type: 'status',
              message: 'Run started.',
              runStartedAt: '2026-03-03T10:00:00.000Z',
            },
          ],
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('rejects legacy runtime identity fields nested in runtime history entries', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [],
          inputs: {},
          outputs: {},
          history: {
            'node-1': [
              {
                timestamp: '2026-03-03T10:00:00.000Z',
                pathId: 'path-1',
                pathName: 'Path 1',
                nodeId: 'node-1',
                nodeType: 'prompt',
                nodeTitle: 'Node 1',
                status: 'completed',
                iteration: 1,
                inputs: {},
                outputs: {},
                inputHash: null,
                runId: 'legacy-run-id',
              },
            ],
          },
        })
      )
    ).toThrowError(/Legacy AI Paths runtime identity fields are no longer supported/i);
  });

  it('accepts canonical runtime payloads with currentRun identity', () => {
    const parsed = parseRuntimeState(
      JSON.stringify({
        status: 'running',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
        currentRun: {
          id: 'run-1',
          status: 'running',
          startedAt: '2026-03-03T10:00:00.000Z',
          finishedAt: null,
          pathId: 'path-1',
          pathName: 'Path 1',
          createdAt: '2026-03-03T10:00:00.000Z',
          updatedAt: '2026-03-03T10:00:00.000Z',
        },
      })
    );

    expect(parsed.currentRun?.id).toBe('run-1');
    expect(parsed.currentRun?.status).toBe('running');
  });

  it('rejects legacy "cancelled" runtime event status spelling', () => {
    expect(() =>
      parseRuntimeState(
        JSON.stringify({
          status: 'running',
          nodeStatuses: {},
          nodeOutputs: {},
          variables: {},
          events: [
            {
              id: 'evt-1',
              timestamp: '2026-03-03T10:00:00.000Z',
              type: 'status',
              message: 'Node cancelled.',
              status: 'cancelled',
            },
          ],
          inputs: {},
          outputs: {},
        })
      )
    ).toThrowError(/Invalid AI Paths runtime state payload\./i);
  });
});
