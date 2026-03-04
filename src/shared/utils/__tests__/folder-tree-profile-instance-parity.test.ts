import { describe, expect, it } from 'vitest';

import { defaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2/defaults';
import {
  folderTreePersistFeedbackByInstance,
  folderTreeSettingsMetaByInstance,
} from '@/shared/utils/folder-tree-profiles-v2/constants';
import { folderTreeInstanceValues } from '@/shared/utils/folder-tree-profiles-v2/types';

const asSorted = (values: readonly string[]): string[] => [...values].sort((a, b) => a.localeCompare(b));

describe('folder-tree instance parity', () => {
  it('keeps profile defaults, settings metadata, and persist feedback aligned with registry', () => {
    const registry = asSorted(folderTreeInstanceValues);
    const defaults = asSorted(Object.keys(defaultFolderTreeProfilesV2));
    const settingsMeta = asSorted(Object.keys(folderTreeSettingsMetaByInstance));
    const persistFeedback = asSorted(Object.keys(folderTreePersistFeedbackByInstance));

    expect(defaults).toEqual(registry);
    expect(settingsMeta).toEqual(registry);
    expect(persistFeedback).toEqual(registry);
  });
});
