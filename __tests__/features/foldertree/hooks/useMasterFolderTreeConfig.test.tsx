import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMasterFolderTreeAppearance } from '@/shared/lib/foldertree/hooks/useMasterFolderTreeAppearance';
import { useMasterFolderTreeConfig } from '@/shared/lib/foldertree/hooks/useMasterFolderTreeConfig';
import { useFolderTreeProfile } from '@/shared/hooks/use-folder-tree-profile';

vi.mock('@/shared/hooks/use-folder-tree-profile', () => ({
  useFolderTreeProfile: vi.fn(),
}));

vi.mock('@/shared/lib/foldertree/hooks/useMasterFolderTreeAppearance', () => ({
  useMasterFolderTreeAppearance: vi.fn(),
}));

describe('useMasterFolderTreeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads profile for instance and derives appearance from it', () => {
    const profile = {
      version: 2,
      placeholders: {
        preset: 'sublime',
        style: 'ghost',
        emphasis: 'subtle',
        rootDropLabel: 'Drop to Root',
        inlineDropLabel: 'Drop to folder',
      },
      icons: {
        slots: {
          folderClosed: 'Folder',
          folderOpen: 'FolderOpen',
          file: 'FileText',
          root: 'Folder',
          dragHandle: 'GripVertical',
        },
        byKind: {},
      },
      nesting: {
        defaultAllow: false,
        blockedTargetKinds: [],
        rules: [],
      },
      interactions: {
        selectionBehavior: 'click_away',
      },
    } as any;
    const appearance = {
      placeholderClasses: {
        lineIdle: 'line-idle',
        lineActive: 'line-active',
        badgeIdle: 'badge-idle',
        badgeActive: 'badge-active',
        rootIdle: 'root-idle',
        rootActive: 'root-active',
      },
      rootDropUi: {
        label: 'Drop to root',
        idleClassName: 'idle',
        activeClassName: 'active',
      },
      resolveIcon: vi.fn(),
    } as ReturnType<typeof useMasterFolderTreeAppearance>;

    vi.mocked(useFolderTreeProfile).mockReturnValue(profile);
    vi.mocked(useMasterFolderTreeAppearance).mockReturnValue(appearance);

    const { result } = renderHook(() => useMasterFolderTreeConfig('notes'));

    expect(useFolderTreeProfile).toHaveBeenCalledWith('notes');
    expect(useMasterFolderTreeAppearance).toHaveBeenCalledWith(profile);
    expect(result.current.profile).toBe(profile);
    expect(result.current.appearance).toBe(appearance);
  });
});
