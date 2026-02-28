import { describe, expect, it } from 'vitest';

import { usePathPersistence } from '../hooks/persistence/usePathPersistence';
import { usePreferencePersistence } from '../hooks/persistence/usePreferencePersistence';
import { usePresetPersistence } from '../hooks/persistence/usePresetPersistence';
import { useAiPathsPersistence } from '../useAiPathsPersistence';

describe('ai paths persistence module imports', () => {
  it('resolves refactored persistence modules', () => {
    expect(usePathPersistence).toBeTypeOf('function');
    expect(usePreferencePersistence).toBeTypeOf('function');
    expect(usePresetPersistence).toBeTypeOf('function');
    expect(useAiPathsPersistence).toBeTypeOf('function');
  });
});
