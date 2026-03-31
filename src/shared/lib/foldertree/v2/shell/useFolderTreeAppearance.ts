'use client';

import { useCallback, useMemo } from 'react';

import type {
  FolderTreeIconSlot,
  FolderTreeProfileV2,
} from '@/shared/contracts/master-folder-tree';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import {
  getFolderTreePlaceholderClasses,
  type FolderTreePlaceholderClassSet,
} from '@/shared/utils/folder-tree-profiles-v2';
import { resolveFolderTreeIconV2 } from '@/shared/utils/folder-tree-profiles-v2';

import type { LucideIcon } from 'lucide-react';

export type ResolveFolderTreeIconInput = {
  slot: FolderTreeIconSlot;
  kind?: string | null;
  fallback: LucideIcon;
  fallbackId?: string | null;
};

export type FolderTreeRootDropUi = {
  label: string;
  idleClassName: string;
  activeClassName: string;
  enabled?: boolean;
};

export type FolderTreeAppearance = {
  placeholderClasses: FolderTreePlaceholderClassSet;
  rootDropUi: FolderTreeRootDropUi;
  resolveIcon: (input: ResolveFolderTreeIconInput) => LucideIcon;
};

export function useFolderTreeAppearance(profile: FolderTreeProfileV2): FolderTreeAppearance {
  const placeholderClasses = useMemo(
    () => getFolderTreePlaceholderClasses(profile.placeholders.preset),
    [profile.placeholders.preset]
  );

  const rootDropUi = useMemo<FolderTreeRootDropUi>(
    () => ({
      label: profile.placeholders.rootDropLabel,
      idleClassName: placeholderClasses.rootIdle,
      activeClassName: placeholderClasses.rootActive,
    }),
    [placeholderClasses.rootActive, placeholderClasses.rootIdle, profile.placeholders.rootDropLabel]
  );

  const resolveIcon = useCallback(
    ({ slot, kind, fallback, fallbackId = null }: ResolveFolderTreeIconInput): LucideIcon => {
      const resolvedIconId = resolveFolderTreeIconV2(profile, slot, kind) ?? fallbackId ?? null;
      if (!resolvedIconId) return fallback;
      return ICON_LIBRARY_MAP[resolvedIconId] ?? fallback;
    },
    [profile]
  );

  return {
    placeholderClasses,
    rootDropUi,
    resolveIcon,
  };
}
