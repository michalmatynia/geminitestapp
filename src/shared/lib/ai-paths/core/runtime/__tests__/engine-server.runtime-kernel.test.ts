import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  clearAiPathsRuntimeCodeObjectResolvers,
  registerAiPathsRuntimeCodeObjectResolver,
} from '@/shared/lib/ai-paths/core/runtime/code-object-resolver-registry';

const { getMongoClientMock } = vi.hoisted(() => ({
  getMongoClientMock: vi.fn(async () => ({})),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {},
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: getMongoClientMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';

const buildConstantNode = (): AiNode => ({
  id: 'node-constant',
  type: 'constant',
  title: 'Constant',
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    constant: {
      valueType: 'string',
      value: 'legacy',
    },
  },
  position: { x: 0, y: 0 },
});

const buildCompareNode = (): AiNode => ({
  id: 'node-compare',
  type: 'compare',
  title: 'Compare',
  description: '',
  inputs: ['value'],
  outputs: ['value', 'valid', 'errors'],
  config: {
    compare: {
      operator: 'eq',
      compareTo: 'legacy',
      caseSensitive: true,
      message: 'Comparison failed',
    },
  },
  position: { x: 220, y: 0 },
});

const buildTriggerNode = (): AiNode => ({
  id: 'node-trigger',
  type: 'trigger',
  title: 'Trigger',
  description: '',
  inputs: [],
  outputs: ['trigger', 'triggerName'],
  config: {
    trigger: {
      event: 'manual',
      contextMode: 'trigger_only',
    },
  },
  position: { x: 0, y: 120 },
});

const buildPromptNode = (): AiNode => ({
  id: 'node-prompt',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: [],
  outputs: ['prompt'],
  config: {
    prompt: {
      template: 'hello-from-prompt',
    },
  },
  position: { x: 0, y: 240 },
});

const buildAudioOscillatorNode = (): AiNode => ({
  id: 'node-audio-osc',
  type: 'audio_oscillator',
  title: 'Audio Oscillator',
  description: '',
  inputs: [],
  outputs: ['audioSignal', 'status'],
  config: {
    audioOscillator: {
      waveform: 'sine',
      frequencyHz: 440,
      gain: 0.5,
      durationMs: 250,
    },
  },
  position: { x: 0, y: 360 },
});

describe('engine-server runtime-kernel resolver wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAiPathsRuntimeCodeObjectResolvers();
  });

  it('executes custom code-object handlers when provided via runtime options', async () => {
    const customConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-custom',
    }));
    const resolveCodeObjectHandler = vi.fn(
      ({ nodeType, codeObjectId }: { nodeType: string; codeObjectId: string }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? customConstantHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['constant'],
      resolveCodeObjectHandler,
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
    expect(customConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-custom');
  });

  it('executes registered runtime code-object resolvers when no per-run resolver is passed', async () => {
    const registeredConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-registered',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.server.registry.constant',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? registeredConstantHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['constant'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(registeredConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-registered');
  });

  it('scopes registered resolvers using runtimeKernelCodeObjectResolverIds', async () => {
    const ignoredHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-ignored',
    }));
    registerAiPathsRuntimeCodeObjectResolver('test.server.registry.ignored', () => ignoredHandler);

    const selectedHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-selected',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.server.registry.selected',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? selectedHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['constant'],
      runtimeKernelCodeObjectResolverIds: ['test.server.registry.selected'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(ignoredHandler).not.toHaveBeenCalled();
    expect(selectedHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-selected');
  });

  it('executes compare nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildConstantNode(), buildCompareNode()],
      edges: [
        {
          id: 'edge-constant-compare',
          from: 'node-constant',
          to: 'node-compare',
          fromPort: 'value',
          toPort: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['constant', 'compare'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-compare']?.['valid']).toBe(true);
    expect(result.outputs?.['node-compare']?.['value']).toBe('legacy');
  });

  it('executes trigger nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildTriggerNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['trigger'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-trigger']?.['trigger']).toBe(true);
    expect(result.outputs?.['node-trigger']?.['triggerName']).toBe('manual');
  });

  it('executes prompt nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildPromptNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-prompt']?.['prompt']).toBe('hello-from-prompt');
  });

  it('executes audio_oscillator nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildAudioOscillatorNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['audio_oscillator'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-audio-osc']?.['status']).toBe('ready');
    expect(result.outputs?.['node-audio-osc']?.['frequency']).toBe(440);
  });
});
