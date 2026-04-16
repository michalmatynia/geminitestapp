'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  useKangurGameInstances,
} from '@/features/kangur/ui/hooks/useKangurGameInstances';
import {
  useKangurLessonGameSections,
} from '@/features/kangur/ui/hooks/useKangurLessonGameSections';

import type {
  GamesLibraryGameModalProps,
  GamesLibraryGameModalState,
} from './GamesLibraryGameModal.types';

export function useGamesLibraryGameModalState({
  open,
  onOpenChange,
  game,
}: GamesLibraryGameModalProps): GamesLibraryGameModalState {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setSettingsOpen(false);
  }, [game?.id]);

  const enabled = open && Boolean(game);
  const gameInstancesQuery = useKangurGameInstances({
    enabled,
    gameId: game?.id,
  });
  const lessonGameSectionsQuery = useKangurLessonGameSections({
    enabled,
    gameId: game?.id,
  });

  const handleCloseModal = useCallback((): void => {
    setSettingsOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return {
    open,
    onOpenChange,
    translations,
    locale,
    settingsOpen,
    setSettingsOpen,
    handleCloseModal,
    game,
    supportsPreviewSettings: game?.id === 'clock_training',
    lessonGameSectionsQuery,
    gameInstancesQuery,
  };
}
