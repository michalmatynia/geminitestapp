import { beforeEach, describe, expect, it, vi } from 'vitest';

const { registerProviderMock, registerSettingsProviderMock } = vi.hoisted(() => ({
  registerProviderMock: vi.fn(),
  registerSettingsProviderMock: vi.fn(),
}));

vi.mock('@/features/ai/server', () => ({
  contextRegistryEngine: {
    registerProvider: registerProviderMock,
  },
}));

vi.mock('@/features/kangur/server/context-registry/kangur-ai-context-provider', () => ({
  kangurRuntimeContextProvider: { id: 'kangur-runtime-context-provider' },
}));

vi.mock('@/shared/lib/db/settings-registry', () => ({
  registerSettingsProvider: registerSettingsProviderMock,
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  deleteKangurSettingValue: vi.fn(),
  isKangurSettingKey: vi.fn(),
  readKangurSettingValue: vi.fn(),
  upsertKangurSettingValue: vi.fn(),
}));

describe('kangur server barrel', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('re-exports the alias and layout helpers used by mobile web routes', async () => {
    const module = await import('@/features/kangur/server');

    expect(module.renderAccessibleKangurAliasRoute).toBeTypeOf('function');
    expect(module.requireAccessibleKangurSlugRoute).toBeTypeOf('function');
    expect(module.getKangurConfiguredLaunchTarget).toBeTypeOf('function');
    expect(module.KangurAliasAppLayout).toBeTypeOf('function');
    expect(module.getKangurStorefrontInitialState).toBeTypeOf('function');
    expect(module.getKangurAuthBootstrapScript).toBeTypeOf('function');
  });

  it('registers the shared Kangur settings and context providers on import', async () => {
    await import('@/features/kangur/server');

    expect(registerSettingsProviderMock).toHaveBeenCalledTimes(1);
    expect(registerProviderMock).toHaveBeenCalledTimes(1);
  });
});
