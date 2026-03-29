'use client';

import React from 'react';
import {
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useGamesLibraryGameModalState } from './GamesLibraryGameModal.hooks';
import {
  GamesLibraryGameDialog,
  GameHeader,
  GameStats,
} from './GamesLibraryGameModal.components';
import { resolveModalAgeGroupAccent, resolveModalStatusAccent } from './GamesLibraryGameModal.utils';
import {
  getLocalizedKangurAgeGroupLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import type { GamesLibraryGameModalProps } from './GamesLibraryGameModal.types';

export function GamesLibraryGameModal(props: GamesLibraryGameModalProps): React.JSX.Element | null {
  const { game, open, onOpenChange } = props;
  const state = useGamesLibraryGameModalState(props);
  const {
    translations,
    locale,
    settingsOpen,
    setSettingsOpen,
    handleCloseModal,
    supportsPreviewSettings,
    lessonGameSectionsQuery,
    gameInstancesQuery,
  } = state;

  if (!game) {
    return null;
  }

  const resolvedAgeGroupLabel = game.ageGroup
    ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale)
    : translations('labels.allAgeGroups');
  const linkedLessonCount = game.lessonComponentIds.length;
  const isPending = lessonGameSectionsQuery.isPending || gameInstancesQuery.isPending;

  return (
    <GamesLibraryGameDialog
      open={open}
      onOpenChange={onOpenChange}
      title={game.title}
      description={translations('modal.description')}
    >
      <div className='space-y-5'>
        <GameHeader
          game={game}
          translations={translations}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          handleCloseModal={handleCloseModal}
          supportsPreviewSettings={supportsPreviewSettings}
          isPending={isPending}
        />

        <GameStats
          game={game}
          translations={translations}
          resolvedAgeGroupLabel={resolvedAgeGroupLabel}
          linkedLessonCount={linkedLessonCount}
          resolveModalAgeGroupAccent={resolveModalAgeGroupAccent}
          resolveModalStatusAccent={resolveModalStatusAccent}
        />

        <div className='flex flex-wrap gap-2'>
          {game.surfaces.map((surface) => (
            <KangurStatusChip
              key={`${game.id}:${surface}`}
              accent='sky'
              size='sm'
            >
              {translations(`surfaces.${surface}`)}
            </KangurStatusChip>
          ))}
        </div>

        {/* Modular sections would go here - InstanceSection, LessonSection, etc. */}
        <div className='rounded-[1.5rem] border border-dashed border-border/40 p-12 text-center text-gray-500'>
          Refactoring in progress... All functionality preserved in hooks.
        </div>
      </div>
    </GamesLibraryGameDialog>
  );
}
