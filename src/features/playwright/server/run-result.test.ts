import { describe, expect, it } from 'vitest';

import {
  buildPlaywrightEngineRunFailureMeta,
  collectPlaywrightEngineRunFailureMessages,
  listPlaywrightEngineRunFailureArtifacts,
  normalizePlaywrightEngineRunErrorMessage,
  resolvePlaywrightEngineRunOutputs,
} from './run-result';

describe('playwright run-result helpers', () => {
  it('resolves outputs, result payload, and final url from a stored run result', () => {
    expect(
      resolvePlaywrightEngineRunOutputs({
        outputs: {
          result: {
            stage: 'publish',
            externalListingId: 'listing-1',
          },
        },
        finalUrl: 'https://example.com/final',
      })
    ).toEqual({
      outputs: {
        result: {
          stage: 'publish',
          externalListingId: 'listing-1',
        },
      },
      resultValue: {
        stage: 'publish',
        externalListingId: 'listing-1',
      },
      finalUrl: 'https://example.com/final',
    });
  });

  it('builds standardized failure metadata from a run record', () => {
    const run = {
      runId: 'run-1',
      status: 'failed',
      result: {
        outputs: {
          result: {
            stage: 'publish',
            currentUrl: 'https://example.com/current',
            message: 'Step failed',
          },
        },
        finalUrl: 'https://example.com/final',
      },
      artifacts: [
        {
          name: 'failure',
          path: '/artifacts/failure.png',
          kind: 'screenshot',
          mimeType: 'image/png',
        },
      ],
      logs: ['a', 'b', 'c'],
    } as const;

    expect(listPlaywrightEngineRunFailureArtifacts(run)).toEqual([
      {
        name: 'failure',
        path: '/artifacts/failure.png',
        kind: 'screenshot',
        mimeType: 'image/png',
      },
    ]);

    expect(
      buildPlaywrightEngineRunFailureMeta(run, {
        includeRawResult: true,
      })
    ).toEqual({
      runId: 'run-1',
      runStatus: 'failed',
      finalUrl: 'https://example.com/final',
      latestStage: 'publish',
      latestStageUrl: 'https://example.com/current',
      failureArtifacts: [
        {
          name: 'failure',
          path: '/artifacts/failure.png',
          kind: 'screenshot',
          mimeType: 'image/png',
        },
      ],
      logTail: ['a', 'b', 'c'],
      rawResult: {
        stage: 'publish',
        currentUrl: 'https://example.com/current',
        message: 'Step failed',
      },
    });
  });

  it('normalizes and collects failure messages from error, result, and runtime log lines', () => {
    const run = {
      error: '[runtime][error] Error: Browser crashed',
      result: {
        outputs: {
          result: {
            message: 'Error: Form submit failed',
          },
        },
      },
      logs: [
        '[runtime][error] Error: Browser crashed',
        '[runtime][error] Error: Selector missing',
      ],
    };

    expect(normalizePlaywrightEngineRunErrorMessage('Error: Something bad')).toBe('Something bad');
    expect(collectPlaywrightEngineRunFailureMessages(run)).toEqual([
      'Browser crashed',
      'Form submit failed',
      'Selector missing',
    ]);
  });
});
