import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import {
  CLIENT_LEGACY_HANDLER_NODE_TYPES,
  CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS,
  evaluateGraphClient,
} from '@/shared/lib/ai-paths/core/runtime/engine-client';

type NodeCodeObjectContractEntry = {
  executionAdapter?: unknown;
  codeObjectId?: unknown;
};

const readNativeContractCodeObjectIdSet = (): Set<string> => {
  const contractsPath = path.join(
    process.cwd(),
    'docs',
    'ai-paths',
    'node-code-objects-v3',
    'contracts.json'
  );
  const payload = JSON.parse(readFileSync(contractsPath, 'utf8')) as {
    contracts?: Record<string, NodeCodeObjectContractEntry>;
  };
  const contracts = payload.contracts ?? {};
  const ids = Object.values(contracts)
    .filter(
      (entry: NodeCodeObjectContractEntry): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map((entry: NodeCodeObjectContractEntry): string => entry.codeObjectId as string);
  return new Set(ids);
};

const readNativeContractCodeObjectIdByNodeType = (): Map<string, string> => {
  const contractsPath = path.join(
    process.cwd(),
    'docs',
    'ai-paths',
    'node-code-objects-v3',
    'contracts.json'
  );
  const payload = JSON.parse(readFileSync(contractsPath, 'utf8')) as {
    contracts?: Record<string, NodeCodeObjectContractEntry>;
  };
  const contracts = payload.contracts ?? {};
  const entries = Object.entries(contracts)
    .filter(
      ([, entry]: [string, NodeCodeObjectContractEntry]): boolean =>
        entry.executionAdapter === 'native_handler_registry' && typeof entry.codeObjectId === 'string'
    )
    .map(([nodeType, entry]: [string, NodeCodeObjectContractEntry]): [string, string] => [
      nodeType,
      entry.codeObjectId as string,
    ]);
  return new Map(entries);
};

const buildUnsupportedModelNode = (): AiNode => ({
  id: 'node-model',
  type: 'model',
  title: 'Model',
  description: '',
  inputs: [],
  outputs: ['result'],
  config: {},
  position: { x: 0, y: 0 },
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
  position: { x: 0, y: 0 },
});

const buildTriggerNode = (): AiNode => ({
  id: 'node-trigger',
  type: 'trigger',
  title: 'Trigger',
  description: '',
  inputs: [],
  outputs: ['trigger', 'triggerName', 'context', 'entityJson'],
  config: {
    trigger: {
      event: 'manual',
    },
  },
  position: { x: 0, y: 0 },
});

const buildSimulationNode = (): AiNode => ({
  id: 'node-simulation',
  type: 'simulation',
  title: 'Simulation',
  description: '',
  inputs: ['trigger'],
  outputs: ['context', 'entityId', 'entityType', 'entityJson'],
  config: {},
  position: { x: 0, y: 0 },
});

const buildFetcherNode = (): AiNode => ({
  id: 'node-fetcher',
  type: 'fetcher',
  title: 'Fetcher',
  description: '',
  inputs: ['trigger', 'context'],
  outputs: ['context', 'meta', 'entityId', 'entityType'],
  config: {
    fetcher: {
      sourceMode: 'live_context',
    },
  },
  position: { x: 120, y: 0 },
});

const buildAudioOscillatorNode = (): AiNode => ({
  id: 'node-audio-oscillator',
  type: 'audio_oscillator',
  title: 'Audio Oscillator',
  description: '',
  inputs: ['trigger', 'frequency', 'waveform', 'gain', 'durationMs'],
  outputs: ['audioSignal', 'frequency', 'waveform', 'gain', 'durationMs', 'status'],
  config: {
    audioOscillator: {
      waveform: 'triangle',
      frequencyHz: 512,
      gain: 0.3,
      durationMs: 640,
    },
  },
  position: { x: 240, y: 0 },
});

const buildAudioSpeakerNode = (): AiNode => ({
  id: 'node-audio-speaker',
  type: 'audio_speaker',
  title: 'Audio Speaker',
  description: '',
  inputs: ['audioSignal', 'trigger'],
  outputs: ['status', 'audioSignal', 'frequency', 'waveform', 'gain', 'durationMs'],
  config: {
    audioSpeaker: {
      enabled: true,
      autoPlay: true,
      gain: 0.8,
      stopPrevious: true,
    },
  },
  position: { x: 360, y: 0 },
});

describe('client native code-object registry contract subset', () => {
  it('only contains codeObjectIds that exist in native contracts', () => {
    const nativeContractIds = readNativeContractCodeObjectIdSet();

    expect(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.length).toBeGreaterThan(0);
    CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS.forEach((codeObjectId: string) => {
      expect(nativeContractIds.has(codeObjectId)).toBe(true);
    });
  });

  it('covers all client-supported pilot node types with native mappings', () => {
    const byNodeType = readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);
    const missingNodeTypes = CLIENT_LEGACY_HANDLER_NODE_TYPES.filter((nodeType: string): boolean => {
      const contractCodeObjectId = byNodeType.get(nodeType);
      if (!contractCodeObjectId) return false;
      return !clientNativeIdSet.has(contractCodeObjectId);
    });

    expect(missingNodeTypes).toEqual([]);
  });

  it('tracks remaining server-only native node-type asymmetries explicitly', () => {
    const byNodeType = readNativeContractCodeObjectIdByNodeType();
    const clientNativeIdSet = new Set<string>(CLIENT_NATIVE_CODE_OBJECT_HANDLER_IDS);

    const unsupportedOnClientNodeTypes = Array.from(byNodeType.entries())
      .filter(([, codeObjectId]: [string, string]) => !clientNativeIdSet.has(codeObjectId))
      .map(([nodeType]: [string, string]) => nodeType)
      .sort();

    expect(unsupportedOnClientNodeTypes).toEqual([
      'agent',
      'ai_description',
      'api_advanced',
      'database',
      'db_schema',
      'description_updater',
      'http',
      'learner_agent',
      'model',
      'playwright',
      'poll',
    ]);
  });

  it('executes prompt nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildPromptNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-prompt']?.['prompt']).toBe('hello-from-prompt');
  });

  it('executes trigger nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildTriggerNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['trigger'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-trigger']?.['trigger']).toBe(true);
    expect(result.outputs?.['node-trigger']?.['triggerName']).toBe('manual');
  });

  it('executes simulation nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildSimulationNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['simulation'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-simulation']?.['entityType']).toBe('product');
    expect(result.outputs?.['node-simulation']?.['context']).toMatchObject({
      contextSource: 'simulation',
      simulationNodeId: 'node-simulation',
      entityType: 'product',
    });
  });

  it('executes fetcher nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildTriggerNode(), buildFetcherNode()],
      edges: [
        {
          id: 'edge-trigger-fetcher',
          from: 'node-trigger',
          to: 'node-fetcher',
          fromPort: 'trigger',
          toPort: 'trigger',
          kind: 'signal',
        },
      ],
      runtimeKernelPilotNodeTypes: ['trigger', 'fetcher'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-fetcher']?.['context']).toMatchObject({
      contextSource: 'trigger_fetcher',
      fetcherNodeId: 'node-fetcher',
    });
    expect(result.outputs?.['node-fetcher']?.['meta']).toMatchObject({
      fetcherResolvedSource: 'live_context',
    });
  });

  it('executes audio oscillator nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildAudioOscillatorNode()],
      edges: [],
      runtimeKernelPilotNodeTypes: ['audio_oscillator'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-oscillator']?.['status']).toBe('ready');
    expect(result.outputs?.['node-audio-oscillator']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('executes audio speaker nodes through client native contract resolver mapping', async () => {
    const result = await evaluateGraphClient({
      nodes: [buildAudioOscillatorNode(), buildAudioSpeakerNode()],
      edges: [
        {
          id: 'edge-osc-speaker-audio-signal',
          from: 'node-audio-oscillator',
          to: 'node-audio-speaker',
          fromPort: 'audioSignal',
          toPort: 'audioSignal',
          kind: 'value',
        },
      ],
      runtimeKernelPilotNodeTypes: ['audio_oscillator', 'audio_speaker'],
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.['node-audio-speaker']?.['status']).toBe('unsupported_environment');
    expect(result.outputs?.['node-audio-speaker']?.['audioSignal']).toMatchObject({
      kind: 'oscillator',
      waveform: 'triangle',
      frequencyHz: 512,
    });
  });

  it('keeps unsupported server-only nodes blocked in client execution', async () => {
    await expect(
      evaluateGraphClient({
        nodes: [buildUnsupportedModelNode()],
        edges: [],
        runtimeKernelPilotNodeTypes: ['model'],
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow(`Node type 'model' is not supported in client-side execution. Use Server execution.`);
  });
});
