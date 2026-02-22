import { describe, expect, it } from 'vitest';

import {
  DESCRIPTION_AND_NAME_PATH_ID,
  needsDescriptionAndNameConfigUpgrade,
  upgradeDescriptionAndNameConfig,
} from '@/features/ai/ai-paths/server/settings-store-description-and-name';

const buildLegacyConfig = (): Record<string, unknown> => ({
  id: DESCRIPTION_AND_NAME_PATH_ID,
  name: 'Description & Name',
  nodes: [
    {
      id: 'node-ozsf40xo',
      type: 'prompt',
      inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
      inputContracts: {
        bundle: { required: false },
        title: { required: false },
        images: { required: false },
        result: { required: false },
        entityId: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
    {
      id: 'node-07ywfx',
      type: 'prompt',
      inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
      inputContracts: {
        bundle: { required: false },
        title: { required: false },
        images: { required: false },
        result: { required: false },
        entityId: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
    {
      id: 'node-bq516q',
      type: 'prompt',
      inputs: ['bundle', 'title', 'images', 'result', 'entityId'],
      inputContracts: {
        bundle: { required: false },
        title: { required: false },
        images: { required: false },
        result: { required: false },
        entityId: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
    {
      id: 'node-o8fdnje9',
      type: 'model',
      inputs: ['prompt', 'images', 'context'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
        context: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
    {
      id: 'node-05y44u',
      type: 'model',
      inputs: ['prompt', 'images', 'context'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
        context: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
    {
      id: 'node-gfrhnz',
      type: 'model',
      inputs: ['prompt', 'images', 'context'],
      inputContracts: {
        prompt: { required: true },
        images: { required: false },
        context: { required: false },
      },
      config: { runtime: { waitForInputs: false } },
    },
  ],
  edges: [],
});

const readNode = (
  parsed: Record<string, unknown>,
  nodeId: string
): Record<string, unknown> => {
  const nodes = Array.isArray(parsed['nodes'])
    ? (parsed['nodes'] as Array<Record<string, unknown>>)
    : [];
  const node = nodes.find(
    (candidate: Record<string, unknown>) => candidate['id'] === nodeId
  );
  if (!node) throw new Error(`Expected node ${nodeId}`);
  return node;
};

const readRequired = (
  node: Record<string, unknown>,
  port: string
): boolean => {
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

describe('Description & Name path config upgrade', () => {
  it('marks legacy config for upgrade', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    expect(needsDescriptionAndNameConfigUpgrade(raw)).toBe(true);
  });

  it('enables wait-for-inputs and required contracts on prompt/model chain', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    const upgradedRaw = upgradeDescriptionAndNameConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    const parsed = JSON.parse(upgradedRaw) as Record<string, unknown>;

    const promptSeed = readNode(parsed, 'node-ozsf40xo');
    const promptName = readNode(parsed, 'node-07ywfx');
    const promptDescription = readNode(parsed, 'node-bq516q');
    const modelSeed = readNode(parsed, 'node-o8fdnje9');
    const modelName = readNode(parsed, 'node-05y44u');
    const modelDescription = readNode(parsed, 'node-gfrhnz');

    expect(readWaitForInputs(promptSeed)).toBe(true);
    expect(readRequired(promptSeed, 'bundle')).toBe(true);
    expect(readRequired(promptSeed, 'result')).toBe(false);

    expect(readWaitForInputs(promptName)).toBe(true);
    expect(readRequired(promptName, 'result')).toBe(true);

    expect(readWaitForInputs(promptDescription)).toBe(true);
    expect(readRequired(promptDescription, 'result')).toBe(true);

    expect(readWaitForInputs(modelSeed)).toBe(true);
    expect(readRequired(modelSeed, 'prompt')).toBe(true);

    expect(readWaitForInputs(modelName)).toBe(true);
    expect(readRequired(modelName, 'prompt')).toBe(true);

    expect(readWaitForInputs(modelDescription)).toBe(true);
    expect(readRequired(modelDescription, 'prompt')).toBe(true);
  });

  it('marks upgraded config as up to date', () => {
    const raw = JSON.stringify(buildLegacyConfig());
    const upgradedRaw = upgradeDescriptionAndNameConfig(raw);
    if (!upgradedRaw) throw new Error('Expected upgraded config');
    expect(needsDescriptionAndNameConfigUpgrade(upgradedRaw)).toBe(false);
  });

  it('does not modify unrelated paths', () => {
    const raw = JSON.stringify({
      id: 'path_other',
      name: 'Other Path',
      nodes: [],
      edges: [],
    });
    expect(needsDescriptionAndNameConfigUpgrade(raw)).toBe(false);
    expect(upgradeDescriptionAndNameConfig(raw)).toBe(raw);
  });
});
