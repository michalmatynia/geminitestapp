import { renderHook } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { useMasterFolderTreeAppearance } from '@/shared/lib/foldertree/hooks/useMasterFolderTreeAppearance';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { createDefaultFolderTreeProfilesV2 } from '@/shared/utils/folder-tree-profiles-v2';

describe('useMasterFolderTreeAppearance', () => {
  it('derives placeholder classes and root drop ui from profile placeholders', () => {
    const profile = {
      ...createDefaultFolderTreeProfilesV2().notes,
      placeholders: {
        ...createDefaultFolderTreeProfilesV2().notes.placeholders,
        preset: 'classic' as const,
        rootDropLabel: 'Move to root',
      },
    };

    const { result } = renderHook(() => useMasterFolderTreeAppearance(profile));

    expect(result.current.placeholderClasses.rootIdle).toContain('border-sky-500');
    expect(result.current.rootDropUi.label).toBe('Move to root');
    expect(result.current.rootDropUi.idleClassName).toBe(result.current.placeholderClasses.rootIdle);
    expect(result.current.rootDropUi.activeClassName).toBe(result.current.placeholderClasses.rootActive);
  });

  it('resolves icons from profile overrides and falls back safely', () => {
    const defaults = createDefaultFolderTreeProfilesV2();
    const knownIconId = Object.keys(ICON_LIBRARY_MAP)[0] ?? null;
    const profile = {
      ...defaults.notes,
      icons: {
        ...defaults.notes.icons,
        byKind: {
          ...defaults.notes.icons.byKind,
          ...(knownIconId ? { note: knownIconId } : {}),
        },
      },
    };

    const { result } = renderHook(() => useMasterFolderTreeAppearance(profile));

    const noteIcon = result.current.resolveIcon({
      slot: 'file',
      kind: 'note',
      fallback: Folder,
      fallbackId: 'Folder',
    });
    expect(noteIcon).toBe(knownIconId ? ICON_LIBRARY_MAP[knownIconId] : Folder);

    const fallbackIcon = result.current.resolveIcon({
      slot: 'file',
      kind: 'unknown-kind',
      fallback: Folder,
      fallbackId: 'DefinitelyMissingIcon',
    });
    expect(fallbackIcon).toBe(Folder);
  });
});
