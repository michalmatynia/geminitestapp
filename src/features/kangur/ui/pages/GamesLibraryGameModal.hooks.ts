'use client';

import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  useKangurGameInstances,
} from '@/features/kangur/ui/hooks/useKangurGameInstances';
import {
  useKangurLessonGameSections,
} from '@/features/kangur/ui/hooks/useKangurLessonGameSections';

import type {
  GamesLibraryGameModalProps,
} from './GamesLibraryGameModal.types';

export function useGamesLibraryGameModalState({
  open,
  onOpenChange,
  game,
}: GamesLibraryGameModalProps) {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    translations,
    locale,
    settingsOpen,
    setSettingsOpen,
    handleCloseModal,
    supportsPreviewSettings: game?.id === 'clock_training',
    lessonGameSectionsQuery,
    gameInstancesQuery,
  };
}
