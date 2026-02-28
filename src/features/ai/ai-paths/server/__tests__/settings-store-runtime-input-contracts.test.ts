import { describe, expect, it } from 'vitest';

import {
  needsRuntimeInputContractsUpgrade,
  upgradeRuntimeInputContractsConfig,
} from '@/features/ai/ai-paths/server/settings-store-runtime-input-contracts';

const readNode = (parsed: Record<string, unknown>, nodeId: string): Record<string, unknown> => {
  const nodes = Array.isArray(parsed['nodes'])
    ? (parsed['nodes'] as Array<Record<string, unknown>>)
    : [];
  const node = nodes.find(
    (candidate: Record<string, unknown>): boolean => candidate['id'] === nodeId
  );
  if (!node) throw new Error(`Expected node ${nodeId}`);
  return node;
};

const readRequired = (node: Record<string, unknown>, port: string): boolean => {
  const contracts =
    node['inputContracts'] && typeof node['inputContracts'] === 'object'
      ? (node['inputContracts'] as Record<string, unknown>)
      : {};
  const contract =
    contracts[port] && typeof contracts[port] === 'object'
      ? (contracts[port] as Record<string, unknown>)
      : {};
  return contract['required'] === true;
};

const readRuntimeRequired = (node: Record<string, unknown>, port: string): boolean => {
  const config =
    node['config'] && typeof node['config'] === 'object'
      ? (node['config'] as Record<string, unknown>)
      : {};
  const runtime =
    config['runtime'] && typeof config['runtime'] === 'object'
      ? (config['runtime'] as Record<string, unknown>)
      : {};
  const contracts =
    runtime['inputContracts'] && typeof runtime['inputContracts'] === 'object'
      ? (runtime['inputContracts'] as Record<string, unknown>)
      : {};
  const contract =
    contracts[port] && typeof contracts[port] === 'object'
      ? (contracts[port] as Record<string, unknown>)
      : {};
  return contract['required'] === true;
};

const readWaitForInputs = (node: Record<string, unknown>): boolean => {
  const config =
    node['config'] && typeof node['config'] === 'object'
      ? (node['config'] as Record<string, unknown>)
      : {};
  const runtime =
    config['runtime'] && typeof config['runtime'] === 'object'
      ? (config['runtime'] as Record<string, unknown>)
      : {};
  return runtime['waitForInputs'] === true;
};

describe('runtime input contracts migration', () => {
  it('relaxes legacy prompt wait-for-inputs contracts injected by mirrored upgrades', () => {
    const raw = JSON.stringify({
      id: 'path_prompt_legacy',
      nodes: [
        {
          id: 'bundle-1',
          type: 'bundle',
          inputs: ['value'],
          outputs: ['bundle'],
        },
        {
          id: 'model-1',
          type: 'model',
          inputs: ['prompt', 'images'],
          outputs: ['result', 'jobId'],
        },
        {
          id: 'prompt-1',
          type: 'prompt',
          inputs: ['bundle', 'result', 'title'],
          outputs: ['prompt', 'images'],
          inputContracts: {
            bundle: { required: true },
            result: { required: true },
            title: { required: false },
          },
          config: {
            runtime: {
              waitForInputs: true,
              inputContracts: {
                bundle: { required: true },
                result: { required: true },
                title: { required: false },
              },
            },
          },
        },
      ],
      edges: [
        {
          id: 'edge-bundle',
          from: 'bundle-1',
          to: 'prompt-1',
          fromPort: 'bundle',
          toPort: 'bundle',
        },
        {
          id: 'edge-model-result',
          from: 'model-1',
          to: 'prompt-1',
          fromPort: 'result',
          toPort: 'result',
        },
      ],
    });

    expect(needsRuntimeInputContractsUpgrade(raw)).toBe(true);
    const upgradedRaw = upgradeRuntimeInputContractsConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    const parsed = JSON.parse(upgradedRaw) as Record<string, unknown>;
    const promptNode = readNode(parsed, 'prompt-1');

    expect(readWaitForInputs(promptNode)).toBe(false);
    expect(readRequired(promptNode, 'bundle')).toBe(false);
    expect(readRequired(promptNode, 'result')).toBe(false);
    expect(readRuntimeRequired(promptNode, 'bundle')).toBe(false);
    expect(readRuntimeRequired(promptNode, 'result')).toBe(false);
  });

  it('normalizes mirrored model contracts to require prompt while keeping images optional', () => {
    const raw = JSON.stringify({
      id: 'path_model_legacy',
      nodes: [
        {
          id: 'prompt-1',
          type: 'prompt',
          inputs: ['bundle'],
          outputs: ['prompt', 'images'],
        },
        {
          id: 'model-1',
          type: 'model',
          inputs: ['prompt', 'images'],
          outputs: ['result', 'jobId'],
          inputContracts: {
            prompt: { required: true },
            images: { required: true },
          },
          config: {
            runtime: {
              waitForInputs: true,
              inputContracts: {
                prompt: { required: true },
                images: { required: true },
              },
            },
          },
        },
      ],
      edges: [
        {
          id: 'edge-prompt',
          from: 'prompt-1',
          to: 'model-1',
          fromPort: 'prompt',
          toPort: 'prompt',
        },
        {
          id: 'edge-images',
          from: 'prompt-1',
          to: 'model-1',
          fromPort: 'images',
          toPort: 'images',
        },
      ],
    });

    expect(needsRuntimeInputContractsUpgrade(raw)).toBe(true);
    const upgradedRaw = upgradeRuntimeInputContractsConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    const parsed = JSON.parse(upgradedRaw) as Record<string, unknown>;
    const modelNode = readNode(parsed, 'model-1');

    expect(readWaitForInputs(modelNode)).toBe(true);
    expect(readRequired(modelNode, 'prompt')).toBe(true);
    expect(readRequired(modelNode, 'images')).toBe(false);
    expect(readRuntimeRequired(modelNode, 'prompt')).toBe(true);
    expect(readRuntimeRequired(modelNode, 'images')).toBe(false);
  });

  it('does not override explicit non-mirrored runtime contracts', () => {
    const raw = JSON.stringify({
      id: 'path_model_manual',
      nodes: [
        {
          id: 'prompt-1',
          type: 'prompt',
          inputs: ['bundle'],
          outputs: ['prompt', 'images'],
        },
        {
          id: 'model-1',
          type: 'model',
          inputs: ['prompt', 'images'],
          outputs: ['result', 'jobId'],
          inputContracts: {
            prompt: { required: true },
            images: { required: false },
          },
          config: {
            runtime: {
              waitForInputs: true,
              inputContracts: {
                prompt: { required: true },
                images: { required: true },
              },
            },
          },
        },
      ],
      edges: [
        {
          id: 'edge-prompt',
          from: 'prompt-1',
          to: 'model-1',
          fromPort: 'prompt',
          toPort: 'prompt',
        },
        {
          id: 'edge-images',
          from: 'prompt-1',
          to: 'model-1',
          fromPort: 'images',
          toPort: 'images',
        },
      ],
    });

    expect(needsRuntimeInputContractsUpgrade(raw)).toBe(false);
    expect(upgradeRuntimeInputContractsConfig(raw)).toBe(raw);
  });

  it('returns null/false for invalid payloads', () => {
    expect(needsRuntimeInputContractsUpgrade('{')).toBe(false);
    expect(upgradeRuntimeInputContractsConfig('{')).toBeNull();
  });
});
