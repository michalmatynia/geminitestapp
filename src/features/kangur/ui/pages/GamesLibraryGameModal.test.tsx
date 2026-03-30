/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultKangurGames } from '@/features/kangur/games';

const modalState = vi.hoisted(() => ({
  value: {
    translations: ((key: string) =>
      (
        {
          'labels.allAgeGroups': 'All age groups',
          'labels.lessonLinks': 'Linked lessons',
          'labels.variants': 'Variants',
          'labels.variantCount': '1 variant',
          'labels.none': 'None',
          'labels.ageGroup': 'Age group',
          'labels.mechanic': 'Mechanic',
          'labels.contentSet': 'Content set',
          'labels.runtime': 'Runtime',
          'labels.launchableRuntime': 'Launch runtime',
          'labels.lessonRuntime': 'Lesson runtime',
          'labels.legacyActivity': 'Legacy activity',
          'labels.legacyScreen': 'Legacy screen',
          'statuses.active': 'Active',
          'statuses.draft': 'Draft',
          'statuses.legacy': 'Legacy',
          'surfaces.lesson': 'Lesson',
          'surfaces.library': 'Library',
          'surfaces.game': 'Game',
          'surfaces.duel': 'Duel',
          'mechanics.clock_training': 'Clock training',
          'variantSurfaces.lesson_inline': 'Lesson inline',
          'variantSurfaces.lesson_stage': 'Lesson stage',
          'variantSurfaces.library_preview': 'Library preview',
          'variantSurfaces.game_screen': 'Game screen',
          'actions.openGame': 'Open game',
          'modal.eyebrow': 'Game scaffold',
          'modal.scaffoldBadge': 'Scaffold',
          'modal.closeButton': 'Close',
          'modal.settingsButton': 'Game settings',
          'modal.hideSettingsButton': 'Hide settings',
          'modal.instancesTitle': 'Saved instances',
          'modal.instancesLoading': 'Saved game instances are loading...',
          'modal.instancesEmpty': 'No saved launchable instances yet.',
          'modal.linkedLessonsEmpty': 'This game is not linked to lesson components yet.',
          'modal.draftListTitle': 'Saved hub sections',
          'modal.draftListEmpty': 'No hub sections yet.',
          'modal.sectionsLoading': 'Saved hub sections are loading...',
          'modal.enabledBadge': 'Enabled',
          'modal.disabledBadge': 'Disabled',
          'modal.settingsTitle': 'Clock preview settings',
          'modal.settingsEmpty': 'No preview settings were saved for this game yet.',
          'modal.settings.clockSectionLabel': 'Clock focus',
          'modal.settings.clockSectionCombined': 'Hours and minutes',
          'modal.settings.initialModeLabel': 'Initial mode',
          'modal.settings.initialModePractice': 'Practice',
          'modal.settings.showHourHandLabel': 'Show hour hand',
          'modal.settings.showMinuteHandLabel': 'Show minute hand',
          'modal.settings.showModeSwitchLabel': 'Show mode switch',
          'modal.settings.showTaskTitleLabel': 'Show task title',
          'modal.settings.showTimeDisplayLabel': 'Show time display',
          'labels.legacyScreens': 'Legacy screens',
        } as Record<string, string>
      )[key] ?? key),
    locale: 'en',
    settingsOpen: true,
    setSettingsOpen: vi.fn(),
    handleCloseModal: vi.fn(),
    supportsPreviewSettings: true,
    lessonGameSectionsQuery: {
      data: [
        {
          id: 'clock-section',
          lessonComponentId: 'clock',
          gameId: 'clock_training',
          instanceId: 'clock-instance',
          title: 'Clock practice',
          description: 'Practice section',
          emoji: '🕒',
          sortOrder: 1,
          enabled: true,
          settings: {
            clock: {
              clockSection: 'combined',
              initialMode: 'practice',
              showHourHand: true,
              showMinuteHand: true,
              showModeSwitch: true,
              showTaskTitle: false,
              showTimeDisplay: true,
            },
          },
        },
      ],
      isPending: false,
    },
    gameInstancesQuery: {
      data: [
        {
          id: 'clock-instance',
          gameId: 'clock_training',
          launchableRuntimeId: 'clock_quiz',
          contentSetId: 'clock:default',
          title: 'Clock warmup',
          description: 'Intro instance',
          emoji: '⏰',
          enabled: true,
          sortOrder: 1,
          engineOverrides: {},
        },
      ],
      isPending: false,
    },
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => modalState.value.translations,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('./GamesLibraryGameModal.hooks', () => ({
  useGamesLibraryGameModalState: () => modalState.value,
}));

import { GamesLibraryGameModal } from './GamesLibraryGameModal';

const TEST_GAME =
  createDefaultKangurGames().find((game) => game.id === 'clock_training') ??
  createDefaultKangurGames()[0];

describe('GamesLibraryGameModal', () => {
  it('renders structured sections instead of the placeholder scaffold body', () => {
    render(
      <GamesLibraryGameModal
        basePath='/kangur'
        game={TEST_GAME}
        onOpenChange={() => undefined}
        open
      />
    );

    expect(screen.getByTestId('games-library-modal-variants')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-modal-instances')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-modal-lessons')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-modal-sections')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-modal-settings')).toBeInTheDocument();
    expect(screen.getByText('Launch runtime')).toBeInTheDocument();
    expect(screen.getByText('Lesson runtime')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('games-library-modal-instances')).getByText('Clock warmup')
    ).toBeInTheDocument();
    expect(screen.getByText('Clock practice')).toBeInTheDocument();
    expect(
      screen.queryByText('Refactoring in progress... All functionality preserved in hooks.')
    ).not.toBeInTheDocument();
  });

  it('shows modal empty states when there is no persisted data', () => {
    modalState.value = {
      ...modalState.value,
      settingsOpen: true,
      supportsPreviewSettings: true,
      lessonGameSectionsQuery: {
        data: [],
        isPending: false,
      },
      gameInstancesQuery: {
        data: [],
        isPending: false,
      },
    };

    render(
      <GamesLibraryGameModal
        basePath='/kangur'
        game={{
          ...TEST_GAME,
          lessonComponentIds: [],
        }}
        onOpenChange={() => undefined}
        open
      />
    );

    expect(screen.getByText('No saved launchable instances yet.')).toBeInTheDocument();
    expect(screen.getByText('This game is not linked to lesson components yet.')).toBeInTheDocument();
    expect(screen.getByText('No hub sections yet.')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-modal-settings')).toBeInTheDocument();
    expect(screen.getByText('No preview settings were saved for this game yet.')).toBeInTheDocument();
  });
});
