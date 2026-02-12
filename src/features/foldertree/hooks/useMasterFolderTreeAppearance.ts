'use client';

import { useCallback, useMemo } from 'react';

import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  getFolderTreePlaceholderClasses,
  resolveFolderTreeIconV2,
  type FolderTreeIconSlot,
  type FolderTreeProfileV2,
} from '@/shared/utils';

import type { LucideIcon } from 'lucide-react';

type ResolveMasterFolderTreeIconInput = {
  slot: FolderTreeIconSlot;
  kind?: string | null;
  fallback: LucideIcon;
  fallbackId?: string | null;
};

type MasterFolderTreeRootDropUi = {
  label: string;
  idleClassName: string;
  activeClassName: string;
};

export function useMasterFolderTreeAppearance(profile: FolderTreeProfileV2): {
  placeholderClasses: ReturnType<typeof getFolderTreePlaceholderClasses>;
  rootDropUi: MasterFolderTreeRootDropUi;
  resolveIcon: (input: ResolveMasterFolderTreeIconInput) => LucideIcon;
} {
  const placeholderClasses = useMemo(
    () => getFolderTreePlaceholderClasses(profile.placeholders.preset),
    [profile.placeholders.preset]
  );

  const rootDropUi = useMemo<MasterFolderTreeRootDropUi>(
    () => ({
      label: profile.placeholders.rootDropLabel,
      idleClassName: placeholderClasses.rootIdle,
      activeClassName: placeholderClasses.rootActive,
    }),
    [placeholderClasses.rootActive, placeholderClasses.rootIdle, profile.placeholders.rootDropLabel]
  );

  const resolveIcon = useCallback(
    ({
      slot,
      kind,
      fallback,
      fallbackId = null,
    }: ResolveMasterFolderTreeIconInput): LucideIcon => {
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
