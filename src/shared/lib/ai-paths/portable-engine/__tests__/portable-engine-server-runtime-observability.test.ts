import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';

import {
  PortablePathValidationError,
  getPortablePathRunExecutionSnapshot,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathEnvelopeVerificationObservabilitySnapshot,
  resetPortablePathMigratorObservabilitySnapshot,
  resetPortablePathRunExecutionSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
} from '../index';
import { runPortablePathServer } from '../server';

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-server', () => ({
  evaluateGraphServer: vi.fn(),
}));

const mockedEvaluateGraphServer = vi.mocked(evaluateGraphServer);

const buildInvalidCompilePath = (): PathConfig => {
  const base = createDefaultPathConfig('path_portable_server_invalid_compile');
  const sourceNode = base.nodes[0]!;
  return {
    ...base,
    nodes: [
      {
        ...sourceNode,
        type: 'model',
        title: 'Model',
        description: 'Model without required prompt wiring.',
        inputs: ['prompt'],
        outputs: ['result'],
      },
    ],
    edges: [],
  };
};

describe('portable AI-path server runtime observability', () => {
  beforeEach(() => {
    mockedEvaluateGraphServer.mockReset();
    resetPortablePathMigratorObservabilitySnapshot();
    resetPortablePathEnvelopeVerificationObservabilitySnapshot();
    resetPortablePathSigningPolicyUsageSnapshot();
    resetPortablePathRunExecutionSnapshot();
    resetPortablePathEnvelopeVerificationAuditSinkSnapshot({
      clearRegisteredSinks: true,
    });
    mockedEvaluateGraphServer.mockResolvedValue({
      status: 'completed',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
    } as RuntimeState);
  });

  it('records successful server runs with source and surface counters', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_server_observability_success');
    await runPortablePathServer(pathConfig, {
      validateBeforeRun: false,
    });

    const call = mockedEvaluateGraphServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call?.['validationMiddleware']).toEqual(expect.any(Function));

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.totals.attempts).toBe(1);
    expect(snapshot.totals.successes).toBe(1);
    expect(snapshot.totals.failures).toBe(0);
    expect(snapshot.byRunner.server.attempts).toBe(1);
    expect(snapshot.byRunner.server.successes).toBe(1);
    expect(snapshot.bySource.path_config.attempts).toBe(1);
    expect(snapshot.bySource.path_config.successes).toBe(1);
    expect(snapshot.bySurface.api.attempts).toBe(1);
    expect(snapshot.recentEvents).toHaveLength(1);
    expect(snapshot.recentEvents[0]?.outcome).toBe('success');
    expect(snapshot.recentEvents[0]?.runner).toBe('server');
  });

  it('allows disabling runtime validation middleware for server runs', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_server_no_runtime_validation');
    await runPortablePathServer(pathConfig, {
      validateBeforeRun: false,
      runtimeValidationEnabled: false,
    });

    expect(mockedEvaluateGraphServer).toHaveBeenCalledTimes(1);
    const call = mockedEvaluateGraphServer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(call, 'validationMiddleware')).toBe(false);
  });

  it('records server run failures across validation/runtime/resolve stages', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_server_observability_failure');
    await expect(runPortablePathServer(buildInvalidCompilePath())).rejects.toBeInstanceOf(
      PortablePathValidationError
    );

    mockedEvaluateGraphServer.mockRejectedValueOnce(new Error('runtime failure from server'));
    await expect(
      runPortablePathServer(pathConfig, {
        validateBeforeRun: false,
      })
    ).rejects.toThrow('runtime failure from server');

    await expect(runPortablePathServer('{')).rejects.toThrow('Invalid AI-Path payload');

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.totals.attempts).toBe(3);
    expect(snapshot.totals.successes).toBe(0);
    expect(snapshot.totals.failures).toBe(3);
    expect(snapshot.byRunner.server.attempts).toBe(3);
    expect(snapshot.byRunner.server.failures).toBe(3);
    expect(snapshot.failureStageCounts.validation).toBe(1);
    expect(snapshot.failureStageCounts.runtime).toBe(1);
    expect(snapshot.failureStageCounts.resolve).toBe(1);
    expect(snapshot.bySource.path_config.attempts).toBe(2);
    expect(snapshot.bySource.path_config.failures).toBe(2);
    expect(snapshot.bySurface.api.failures).toBe(3);
    expect(snapshot.recentEvents).toHaveLength(3);
    expect(snapshot.recentEvents.map((event) => event.failureStage)).toEqual([
      'validation',
      'runtime',
      'resolve',
    ]);
  });
});
