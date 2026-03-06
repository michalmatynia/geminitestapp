import { describe, expect, it } from 'vitest';

import {
  HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS,
  normalizeHistoricalRuntimeKernelParityStrategyCountsMeta,
  normalizeHistoricalRuntimeStateCompatibilityHistoryField,
} from '../../../scripts/db/ai-paths-runtime-compatibility-normalization';

describe('normalizeHistoricalRuntimeStateCompatibilityHistoryField', () => {
  it('rewrites legacy runtimeStrategy aliases in string runtimeState payloads', () => {
    const result = normalizeHistoricalRuntimeStateCompatibilityHistoryField(
      JSON.stringify({
        status: 'running',
        history: {
          'node-1': [
            {
              runtimeStrategy: HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS,
            },
          ],
        },
      })
    );

    expect(result.changed).toBe(true);
    expect(JSON.parse(String(result.value))).toEqual({
      status: 'running',
      history: {
        'node-1': [
          {
            runtimeStrategy: 'compatibility',
          },
        ],
      },
    });
  });
});

describe('normalizeHistoricalRuntimeKernelParityStrategyCountsMeta', () => {
  it('rewrites legacy runtimeTrace strategyCounts aliases in run metadata', () => {
    const result = normalizeHistoricalRuntimeKernelParityStrategyCountsMeta({
      runtimeTrace: {
        kernelParity: {
          strategyCounts: {
            [HISTORICAL_RUNTIME_COMPATIBILITY_ALIAS]: 3,
            code_object_v3: 1,
            unknown: 0,
          },
        },
      },
    });

    expect(result.changed).toBe(true);
    expect(result.value).toEqual({
      runtimeTrace: {
        kernelParity: {
          strategyCounts: {
            compatibility: 3,
            code_object_v3: 1,
            unknown: 0,
          },
        },
      },
    });
  });
});
