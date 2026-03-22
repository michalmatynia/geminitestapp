import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AI_BRAIN_SETTINGS_KEY, defaultBrainSettings } from '../settings';

const {
  deleteKangurSettingValueMock,
  isKangurSettingKeyMock,
  readKangurSettingValueMock,
  upsertKangurSettingValueMock,
  getMongoDbMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  deleteKangurSettingValueMock: vi.fn(),
  isKangurSettingKeyMock: vi.fn(),
  readKangurSettingValueMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  deleteKangurSettingValue: deleteKangurSettingValueMock,
  isKangurSettingKey: isKangurSettingKeyMock,
  readKangurSettingValue: readKangurSettingValueMock,
  upsertKangurSettingValue: upsertKangurSettingValueMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

const createBrainSettingsJson = (overrides?: Record<string, unknown>): string =>
  JSON.stringify({
    ...defaultBrainSettings,
    ...overrides,
  });

describe('ai-brain server helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env['MONGODB_URI'];
    deleteKangurSettingValueMock.mockReset();
    isKangurSettingKeyMock.mockReset();
    readKangurSettingValueMock.mockReset();
    upsertKangurSettingValueMock.mockReset();
    getMongoDbMock.mockReset();
    captureExceptionMock.mockReset();

    isKangurSettingKeyMock.mockReturnValue(false);
    upsertKangurSettingValueMock.mockResolvedValue(true);
    deleteKangurSettingValueMock.mockResolvedValue(true);
  });

  it('caches AI brain settings reads and resets the cache on upsert/delete', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ value: 'stored-value' })
      .mockResolvedValueOnce({ value: 'fresh-after-delete' });
    const updateOne = vi.fn().mockResolvedValue({});
    const deleteOne = vi.fn().mockResolvedValue({});
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({ findOne, updateOne, deleteOne }),
    });

    const server = await import('../server');
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)
      .mockReturnValueOnce(4_000)
      .mockReturnValueOnce(5_000);

    await expect(server.readStoredSettingValue(AI_BRAIN_SETTINGS_KEY)).resolves.toBe('stored-value');
    await expect(server.readStoredSettingValue(AI_BRAIN_SETTINGS_KEY)).resolves.toBe('stored-value');
    expect(findOne).toHaveBeenCalledTimes(1);

    await expect(server.upsertStoredSettingValue(AI_BRAIN_SETTINGS_KEY, 'updated-value')).resolves.toBe(
      true
    );
    await expect(server.readStoredSettingValue(AI_BRAIN_SETTINGS_KEY)).resolves.toBe('updated-value');
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(1);

    await expect(server.deleteStoredSettingValue(AI_BRAIN_SETTINGS_KEY)).resolves.toBe(true);
    await expect(server.readStoredSettingValue(AI_BRAIN_SETTINGS_KEY)).resolves.toBe(
      'fresh-after-delete'
    );
    expect(deleteOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('returns feature and capability assignments from stored brain settings', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const settingsJson = createBrainSettingsJson({
      assignments: {
        ...defaultBrainSettings.assignments,
        products: {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'model',
          modelId: 'gpt-4.1-mini',
          temperature: 0.4,
          maxTokens: 700,
        },
      },
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'chatbot.reply': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'model',
          modelId: 'gpt-4.1',
          systemPrompt: '  Be helpful.  ',
        },
      },
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ value: settingsJson }),
      }),
    });

    const server = await import('../server');

    await expect(server.getBrainAssignmentForFeature('products')).resolves.toMatchObject({
      modelId: 'gpt-4.1-mini',
      temperature: 0.4,
      maxTokens: 700,
    });
    await expect(server.getBrainAssignmentForCapability('chatbot.reply')).resolves.toMatchObject({
      modelId: 'gpt-4.1',
      systemPrompt: 'Be helpful.',
    });
    expect(server.resolveBrainCapabilityPolicy('cms.css_stream')).toBe('agent-or-model');
  });

  it('builds model, agent, and AI-path node execution configs from stored settings', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const settingsJson = createBrainSettingsJson({
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'chatbot.reply': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'model',
          modelId: 'gpt-4.1-mini',
          temperature: 0.45,
          maxTokens: 650,
          systemPrompt: '  Use concise answers.  ',
        },
        'cms.css_stream': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'agent',
          agentId: 'agent-css-1',
          temperature: 0.2,
          maxTokens: 300,
        },
        'ai_paths.model': {
          ...defaultBrainSettings.defaults,
          enabled: true,
          provider: 'model',
          modelId: 'brain-default-model',
          temperature: 0.55,
          maxTokens: 900,
          systemPrompt: '  Brain default system prompt.  ',
        },
      },
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ value: settingsJson }),
      }),
    });

    const server = await import('../server');

    await expect(
      server.resolveBrainExecutionConfigForCapability('chatbot.reply', {
        defaultTemperature: 0.1,
        defaultMaxTokens: 200,
        defaultSystemPrompt: 'fallback',
      })
    ).resolves.toMatchObject({
      capability: 'chatbot.reply',
      provider: 'model',
      modelId: 'gpt-4.1-mini',
      temperature: 0.45,
      maxTokens: 650,
      systemPrompt: 'Use concise answers.',
      brainApplied: expect.objectContaining({
        provider: 'model',
        modelId: 'gpt-4.1-mini',
        runtimeKind: 'chat',
      }),
    });

    await expect(
      server.resolveBrainExecutionConfigForCapability('cms.css_stream', {
        defaultSystemPrompt: 'fallback agent prompt',
        runtimeKind: 'chat',
      })
    ).resolves.toMatchObject({
      capability: 'cms.css_stream',
      provider: 'agent',
      agentId: 'agent-css-1',
      modelId: '',
      systemPrompt: 'fallback agent prompt',
      brainApplied: expect.objectContaining({
        provider: 'agent',
        runtimeKind: 'chat',
      }),
    });

    await expect(
      server.resolveAiPathsNodeExecutionConfig({
        requestedModelId: 'node-model',
        requestedTemperature: 0.1,
        requestedMaxTokens: 120,
        requestedSystemPrompt: 'Node system prompt',
        runtimeKind: 'completion',
      })
    ).resolves.toMatchObject({
      capability: 'ai_paths.model',
      provider: 'model',
      modelId: 'node-model',
      temperature: 0.1,
      maxTokens: 120,
      systemPrompt: 'Node system prompt',
      brainApplied: expect.objectContaining({
        runtimeKind: 'completion',
        modelSelectionSource: 'node',
        defaultModelId: 'brain-default-model',
      }),
    });
  });

  it('captures storage failures and rejects invalid execution assignments', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    const storageError = new Error('mongo read failed');
    getMongoDbMock.mockRejectedValueOnce(storageError);

    const server = await import('../server');

    await expect(server.readStoredSettingValue('custom-key')).resolves.toBeNull();
    expect(captureExceptionMock).toHaveBeenCalledWith(storageError);

    const disabledSettingsJson = createBrainSettingsJson({
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'chatbot.reply': {
          ...defaultBrainSettings.defaults,
          enabled: false,
          provider: 'model',
          modelId: 'gpt-4.1-mini',
        },
      },
    });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        findOne: vi.fn().mockResolvedValue({ value: disabledSettingsJson }),
      }),
    });

    await expect(server.resolveBrainExecutionConfigForCapability('chatbot.reply')).rejects.toThrow(
      /disabled in AI Brain/i
    );
  });
});
