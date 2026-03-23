import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

const { mockResolvePortablePathInput } = vi.hoisted(() => ({
  mockResolvePortablePathInput: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/portable-engine', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/portable-engine')>(
    '@/shared/lib/ai-paths/portable-engine'
  );
  return {
    ...actual,
    resolvePortablePathInput: mockResolvePortablePathInput,
  };
});

import { materializeStoredTriggerPathConfig } from '../stored-trigger-path-config';

describe('materializeStoredTriggerPathConfig', () => {
  beforeEach(() => {
    mockResolvePortablePathInput.mockReset();
  });

  it('does not mark equivalent stored configs as changed when identity repair is a no-op', () => {
    const config = createDefaultPathConfig('path-equivalent-repair');
    const rawConfig = JSON.stringify(config);

    mockResolvePortablePathInput.mockImplementation((value: unknown) => ({
      ok: true,
      value: {
        pathConfig: value,
        identityRepaired: true,
        warnings: [],
      },
    }));

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    expect(resolved.config).toEqual(config);
    expect(resolved.changed).toBe(false);
  });
});
