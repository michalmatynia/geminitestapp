import { describe, expect, it } from 'vitest';

import {
  runKernelPath,
  runTransformKernelPath,
  stripRuntimeTelemetry,
} from './engine-core.runtime-kernel-parity.builders';

describe('engine-core runtime-kernel canonical parity', () => {
  it('keeps outputs and node statuses identical for default and explicit numeric runtime-kernel paths', async () => {
    const implicit = await runKernelPath('default', 7);
    const explicit = await runKernelPath('explicit', 7);

    expect(implicit.result.status).toBe('completed');
    expect(explicit.result.status).toBe('completed');
    expect(implicit.result.outputs).toEqual(explicit.result.outputs);
    expect(implicit.result.nodeStatuses).toEqual(explicit.result.nodeStatuses);
    expect(stripRuntimeTelemetry(implicit.result.history)).toEqual(
      stripRuntimeTelemetry(explicit.result.history)
    );

    const implicitNodeEvents = implicit.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const explicitNodeEvents = explicit.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(implicitNodeEvents).toHaveLength(3);
    expect(explicitNodeEvents).toHaveLength(3);
    implicitNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
    explicitNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });

  it('keeps outputs and node statuses identical for default and explicit non-numeric paths', async () => {
    const implicit = await runKernelPath('default', 'abc');
    const explicit = await runKernelPath('explicit', 'abc');

    expect(implicit.result.status).toBe('completed');
    expect(explicit.result.status).toBe('completed');
    expect(implicit.result.outputs).toEqual(explicit.result.outputs);
    expect(implicit.result.nodeStatuses).toEqual(explicit.result.nodeStatuses);
    expect(stripRuntimeTelemetry(implicit.result.history)).toEqual(
      stripRuntimeTelemetry(explicit.result.history)
    );

    expect(implicit.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
    expect(explicit.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
  });

  it('keeps outputs, statuses, and strategy telemetry identical for default and explicit transform paths', async () => {
    const implicit = await runTransformKernelPath('default', 'Wave A Kernel');
    const explicit = await runTransformKernelPath('explicit', 'Wave A Kernel');

    expect(implicit.result.status).toBe('completed');
    expect(explicit.result.status).toBe('completed');
    expect(implicit.result.outputs).toEqual(explicit.result.outputs);
    expect(implicit.result.nodeStatuses).toEqual(explicit.result.nodeStatuses);
    expect(stripRuntimeTelemetry(implicit.result.history)).toEqual(
      stripRuntimeTelemetry(explicit.result.history)
    );

    const implicitPrompt = implicit.result.outputs['node-template']?.['prompt'];
    const explicitPrompt = explicit.result.outputs['node-template']?.['prompt'];
    expect(typeof implicitPrompt).toBe('string');
    expect(implicitPrompt).toBe(explicitPrompt);
    expect(String(implicitPrompt)).toContain('-mutated-v3');

    const implicitNodeEvents = implicit.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const explicitNodeEvents = explicit.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(implicitNodeEvents).toHaveLength(3);
    expect(explicitNodeEvents).toHaveLength(3);

    implicitNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
    explicitNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });
});
