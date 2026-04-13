'use client';

import React, { createContext, useContext, useMemo } from 'react';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { buildKangurGameLaunchHref } from '@/features/kangur/ui/services/game-launch';
import { resolveModalAgeGroupAccent, resolveModalStatusAccent } from './GamesLibraryGameModal.utils';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import type {
  GamesLibraryGameModalContextValue,
  GamesLibraryGameModalState,
} from './GamesLibraryGameModal.types';

const GamesLibraryGameModalContext = createContext<GamesLibraryGameModalContextValue | null>(null);

export function useGamesLibraryGameModalContext(): GamesLibraryGameModalContextValue {
  const context = useContext(GamesLibraryGameModalContext);
  if (!context) {
    throw new Error(
      'useGamesLibraryGameModalContext must be used within a GamesLibraryGameModalProvider'
    );
  }
  return context;
}

export function GamesLibraryGameModalProvider({
  children,
  state,
  basePath,
}: {
  children: React.ReactNode;
  state: GamesLibraryGameModalState;
  basePath: string;
}) {
  const { game, locale, translations, lessonGameSectionsQuery, gameInstancesQuery } = state;

  const value = useMemo<GamesLibraryGameModalContextValue | null>(() => {
    if (!game) return null;

    const resolvedAgeGroupLabel = game.ageGroup
      ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale)
      : translations('labels.allAgeGroups');
    const subjectLabel = getLocalizedKangurSubjectLabel(game.subject, locale, game.subject);
    const linkedLessonCount = game.lessonComponentIds.length;
    const isPending = lessonGameSectionsQuery.isPending || gameInstancesQuery.isPending;
    const gameHref = buildKangurGameLaunchHref(basePath, game) ?? null;

    return {
      ...state,
      resolvedAgeGroupLabel,
      subjectLabel,
      linkedLessonCount,
      isPending,
      gameHref,
      resolveModalAgeGroupAccent,
      resolveModalStatusAccent,
    };
  }, [state, game, locale, translations, lessonGameSectionsQuery.isPending, gameInstancesQuery.isPending, basePath]);

  if (!value) return null;

  return (
    <GamesLibraryGameModalContext.Provider value={value}>
      {children}
    </GamesLibraryGameModalContext.Provider>
  );
}
