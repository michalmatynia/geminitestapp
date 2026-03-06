import { describe, expect, it } from 'vitest';

import {
  runKernelPath,
  runTransformKernelPath,
  stripRuntimeTelemetry,
} from './engine-core.runtime-kernel-parity.builders';

describe('engine-core runtime-kernel dual-run parity', () => {
  it('keeps outputs and node statuses identical for numeric runtime-kernel path', async () => {
    const legacy = await runKernelPath('legacy_adapter', 7);
    const v3 = await runKernelPath('code_object_v3', 7);

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(
      stripRuntimeTelemetry(v3.result.history)
    );

    const legacyNodeEvents = legacy.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const v3NodeEvents = v3.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(legacyNodeEvents).toHaveLength(3);
    expect(v3NodeEvents).toHaveLength(3);
    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });

  it('keeps outputs and node statuses identical for non-numeric fallback path', async () => {
    const legacy = await runKernelPath('legacy_adapter', 'abc');
    const v3 = await runKernelPath('code_object_v3', 'abc');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(
      stripRuntimeTelemetry(v3.result.history)
    );

    expect(legacy.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
    expect(v3.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
  });

  it('keeps outputs, statuses, and strategy telemetry identical for transform runtime-kernel path', async () => {
    const legacy = await runTransformKernelPath('legacy_adapter', 'Wave A Kernel');
    const v3 = await runTransformKernelPath('code_object_v3', 'Wave A Kernel');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(
      stripRuntimeTelemetry(v3.result.history)
    );

    const legacyPrompt = legacy.result.outputs['node-template']?.['prompt'];
    const v3Prompt = v3.result.outputs['node-template']?.['prompt'];
    expect(typeof legacyPrompt).toBe('string');
    expect(legacyPrompt).toBe(v3Prompt);
    expect(String(legacyPrompt)).toContain('-mutated-v3');

    const legacyNodeEvents = legacy.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const v3NodeEvents = v3.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(legacyNodeEvents).toHaveLength(35);
    expect(v3NodeEvents).toHaveLength(35);

    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });
});
