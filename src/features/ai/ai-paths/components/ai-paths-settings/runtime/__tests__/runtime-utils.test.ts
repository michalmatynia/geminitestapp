import { describe, expect, it } from 'vitest';

import {
  mergeRuntimeNodeOutputsForStatus,
  mergeRuntimeStateSnapshot,
  resolveRuntimeNodeDisplayStatus,
} from '../utils';

import type { RuntimeState } from '@/shared/lib/ai-paths';

describe('mergeRuntimeNodeOutputsForStatus', () => {
  it('maps blocked missing-input updates to waiting_callback', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'running',
      },
      next: {
        blockedReason: 'missing_inputs',
        waitingOnPorts: ['prompt'],
      },
      status: 'blocked',
    });

    expect(merged['status']).toBe('waiting_callback');
    expect(merged['blockedReason']).toBe('missing_inputs');
    expect(merged['waitingOnPorts']).toEqual(['prompt']);
  });

  it('maps blocked updates with waiting ports and no reason to waiting_callback', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'running',
      },
      next: {
        waitingOnPorts: ['prompt'],
      },
      status: 'blocked',
    });

    expect(merged['status']).toBe('waiting_callback');
    expect(merged['waitingOnPorts']).toEqual(['prompt']);
  });

  it('keeps waiting diagnostics when status is waiting_callback', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'waiting_callback',
        blockedReason: 'missing_inputs',
      },
      next: {
        waitingOnPorts: ['bundle'],
      },
      status: 'waiting_callback',
    });

    expect(merged['status']).toBe('waiting_callback');
    expect(merged['blockedReason']).toBe('missing_inputs');
    expect(merged['waitingOnPorts']).toEqual(['bundle']);
  });

  it('drops blocked diagnostics after status leaves blocked state', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'blocked',
        blockedReason: 'missing_inputs',
        requiredPorts: ['prompt'],
        waitingOnPorts: ['prompt'],
        message: 'Waiting on prompt',
      },
      next: {
        result: 'ok',
      },
      status: 'completed',
    });

    expect(merged['status']).toBe('completed');
    expect(merged['result']).toBe('ok');
    expect(merged['blockedReason']).toBeUndefined();
    expect(merged['requiredPorts']).toBeUndefined();
    expect(merged['waitingOnPorts']).toBeUndefined();
    expect(merged['message']).toBeUndefined();
  });

  it('drops stale error when status is no longer failed', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'failed',
        error: 'old failure',
      },
      next: {
        result: 'ok',
      },
      status: 'completed',
    });

    expect(merged['status']).toBe('completed');
    expect(merged['result']).toBe('ok');
    expect(merged['error']).toBeUndefined();
  });

  it('drops stale error when failed status update omits error details', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'failed',
        error: 'old failure',
      },
      next: {
        result: '',
      },
      status: 'failed',
    });

    expect(merged['status']).toBe('failed');
    expect(merged['result']).toBe('');
    expect(merged['error']).toBeUndefined();
  });

  it('keeps blocked diagnostics when status is still blocked', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'blocked',
        blockedReason: 'missing_prompt',
      },
      next: {
        waitingOnPorts: ['prompt'],
      },
      status: 'blocked',
    });

    expect(merged['status']).toBe('blocked');
    expect(merged['blockedReason']).toBe('missing_prompt');
    expect(merged['waitingOnPorts']).toEqual(['prompt']);
  });

  it('does not map run-status aliases to node status', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: {
        status: 'running',
      },
      next: {
        status: 'dead_lettered',
        message: 'run reached dead-letter queue',
      },
      status: 'dead_lettered',
    });

    expect(merged['status']).toBe('running');
    expect(merged['message']).toBe('run reached dead-letter queue');
  });

  it('drops unknown status when there is no previous canonical status', () => {
    const merged = mergeRuntimeNodeOutputsForStatus({
      previous: undefined,
      next: {
        status: 'paused',
        note: 'unsupported status',
      },
      status: 'paused',
    });

    expect(merged['status']).toBeUndefined();
    expect(merged['note']).toBe('unsupported status');
  });
});

describe('resolveRuntimeNodeDisplayStatus', () => {
  it('maps blocked missing_inputs reason from metadata to waiting_callback', () => {
    const status = resolveRuntimeNodeDisplayStatus({
      status: 'blocked',
      metadata: {
        reason: 'missing_inputs',
      },
    });

    expect(status).toBe('waiting_callback');
  });

  it('maps blocked status with waiting ports and no reason to waiting_callback', () => {
    const status = resolveRuntimeNodeDisplayStatus({
      status: 'blocked',
      metadata: {
        waitingOnPorts: ['prompt'],
      },
    });

    expect(status).toBe('waiting_callback');
  });

  it('keeps blocked status when blocked reason is not missing_inputs', () => {
    const status = resolveRuntimeNodeDisplayStatus({
      status: 'blocked',
      metadata: {
        reason: 'missing_prompt',
        waitingOnPorts: ['prompt'],
      },
    });

    expect(status).toBe('blocked');
  });
});

describe('mergeRuntimeStateSnapshot', () => {
  it('clears stale blocked diagnostics in merged outputs when incoming status completes', () => {
    const current = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {
        prompt_node: {
          status: 'blocked',
          blockedReason: 'missing_inputs',
          waitingOnPorts: ['description'],
          message: 'Waiting on description',
        },
      },
    } as RuntimeState;

    const incoming = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {
        prompt_node: {
          status: 'completed',
          prompt: 'resolved prompt',
        },
      },
    } as RuntimeState;

    const merged = mergeRuntimeStateSnapshot(current, incoming);
    const promptOutputs = merged.outputs?.['prompt_node'] ?? {};

    expect(promptOutputs['status']).toBe('completed');
    expect(promptOutputs['prompt']).toBe('resolved prompt');
    expect(promptOutputs['blockedReason']).toBeUndefined();
    expect(promptOutputs['waitingOnPorts']).toBeUndefined();
    expect(promptOutputs['message']).toBeUndefined();
  });

  it('keeps existing node outputs when snapshot has no update for that node', () => {
    const current = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {
        fetcher_node: {
          status: 'completed',
          message: 'existing message output',
        },
      },
    } as RuntimeState;

    const incoming = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {
        prompt_node: {
          status: 'running',
        },
      },
    } as RuntimeState;

    const merged = mergeRuntimeStateSnapshot(current, incoming);
    const fetcherOutputs = merged.outputs?.['fetcher_node'] ?? {};

    expect(fetcherOutputs['status']).toBe('completed');
    expect(fetcherOutputs['message']).toBe('existing message output');
  });
});
