import type { BlockInstance, PageComponentInput } from '@/shared/contracts/cms';
import {
  makeBlockSection,
  makeButtonBlock,
  makeContainerBlock,
  makeHeadingBlock,
  makeInputBlock,
  makeProgressBlock,
  makeRepeaterBlock,
  makeTextBlock,
  makeWidgetBlock,
  withOrders,
} from '../project-factories';
import {
  makeGridColumn,
  makeGridRow,
  makeGridSection,
  makeGameMetricCard,
  makeGameUserVisibilitySettings,
  makeRuntimeVisibilitySettings,
} from '../project-sections';
import { makeLeaderboardSection } from '../project-leaderboard';

export const makeGameScreenVisibilitySettings = (
  screen:
    | 'home'
    | 'training'
    | 'kangur_setup'
    | 'kangur'
    | 'calendar_quiz'
    | 'geometry_quiz'
    | 'operation'
    | 'playing'
    | 'result'
): Record<string, unknown> =>
  makeRuntimeVisibilitySettings({
    mode: 'equal',
    path: 'game.screen',
    value: screen,
  });

export const makeGameLeaderboardPanel = (input: {
  id: string;
  title: string;
  description: string;
}): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      paddingTop: 32,
      paddingBottom: 32,
      paddingLeft: 28,
      paddingRight: 28,
      blockGap: 16,
      background: { type: 'solid', color: '#ffffff' },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: '#eceff7',
        radius: 32,
      },
      sectionShadow: {
        x: 0,
        y: 24,
        blur: 60,
        spread: 0,
        color: '#a8afd82e',
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-title`, input.title, 28, {
        textColor: '#1e293b',
      }),
      makeTextBlock(`${input.id}-description`, input.description, {
        fontSize: 15,
        textColor: '#7a86b0',
      }),
      makeLeaderboardSection({ id: `${input.id}-ranking` }).content.blocks[1] as BlockInstance,
    ],
  });

export const makeGameTrainingSetupPanel = (input: { id: string }): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      blockGap: 16,
      background: { type: 'solid', color: '#ffffff' },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: '#eceff7',
        radius: 28,
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-title`, 'Ustawienia treningu', 26, {
        textColor: '#1e293b',
      }),
      makeWidgetBlock(`${input.id}-widget`, 'game-training-setup'),
    ],
  });

export const makeGameOperationSelectorPanel = (input: { id: string }): BlockInstance =>
  makeContainerBlock({
    id: input.id,
    settings: {
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      blockGap: 16,
      background: { type: 'solid', color: '#ffffff' },
      sectionBorder: {
        width: 1,
        style: 'solid',
        color: '#eceff7',
        radius: 28,
      },
    },
    blocks: [
      makeHeadingBlock(`${input.id}-title`, 'Wybierz operację', 26, {
        textColor: '#1e293b',
      }),
      makeWidgetBlock(`${input.id}-widget`, 'game-operation-selector'),
    ],
  });

export const createDefaultGameScreenComponents = (): PageComponentInput[] =>
  withOrders([
    makeBlockSection({
      id: 'kangur-game-navigation',
      blocks: [makeWidgetBlock('kangur-widget-game-navigation', 'game-navigation')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
    makeBlockSection({
      id: 'kangur-game-xp-toast',
      blocks: [makeWidgetBlock('kangur-widget-game-xp-toast', 'game-xp-toast')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    }),
    makeGridSection({
      id: 'kangur-game-home-grid',
      rows: [
        makeGridRow({
          id: 'kangur-game-home-row',
          columns: [
            makeGridColumn({
              id: 'kangur-game-home-primary',
              blocks: [
                makeContainerBlock({
                  id: 'kangur-game-home-guest-panel',
                  settings: {
                    paddingTop: 28,
                    paddingBottom: 28,
                    paddingLeft: 28,
                    paddingRight: 28,
                    blockGap: 16,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeGameUserVisibilitySettings('falsy'),
                  },
                  blocks: [
                    makeTextBlock('kangur-game-home-guest-label', 'Imie gracza', {
                      fontSize: 14,
                      fontWeight: '700',
                      letterSpacing: 1.8,
                      textColor: '#97a0c3',
                    }),
                    makeInputBlock('kangur-game-home-guest-name', {
                      inputPlaceholder: 'Wpisz swoje imie...',
                      inputAutoComplete: 'nickname',
                      inputMaxLength: 20,
                      fontSize: 18,
                      fontWeight: '500',
                      textColor: '#334155',
                      bgColor: '#ffffff',
                      borderColor: '#eceff7',
                      borderRadius: 22,
                      borderWidth: 1,
                      height: 58,
                      inputChangeActionSource: 'kangur',
                      inputChangeActionPath: 'game.setPlayerName',
                      inputSubmitActionSource: 'kangur',
                      inputSubmitActionPath: 'game.handleStartGame',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'game.playerName',
                        fallback: '',
                      },
                    }),
                    makeContainerBlock({
                      id: 'kangur-game-home-guest-login-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 12,
                      },
                      blocks: [
                        makeTextBlock(
                          'kangur-game-home-guest-login-copy',
                          'Zaloguj się, aby Twój wynik pojawił się na tablicy.',
                          {
                            fontSize: 15,
                            textColor: '#8c97bb',
                          }
                        ),
                        makeButtonBlock('kangur-game-home-guest-login-button', 'Zaloguj się', {
                          buttonStyle: 'solid',
                          runtimeActionSource: 'kangur',
                          runtimeActionPath: 'game.navigateToLogin',
                          fontSize: 14,
                          fontWeight: '600',
                          textColor: '#334155',
                          bgColor: '#eef2ff',
                          borderColor: '#dbeafe',
                          borderRadius: 18,
                          borderWidth: 1,
                        }),
                      ],
                    }),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-assignment-spotlight',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 12,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeRuntimeVisibilitySettings({
                      mode: 'truthy',
                      path: 'game.homeSpotlight.hasAssignment',
                    }),
                  },
                  blocks: [
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-priority',
                      'Priorytet wysoki',
                      {
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 1.4,
                        textColor: '#f59e0b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.priorityLabel',
                          fallback: 'Priorytet wysoki',
                        },
                      }
                    ),
                    makeHeadingBlock(
                      'kangur-game-home-assignment-spotlight-title',
                      'Zadanie od rodzica',
                      28,
                      {
                        textColor: '#1e293b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.title',
                          fallback: 'Zadanie od rodzica',
                        },
                      }
                    ),
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-description',
                      'Wróć do zadania i kontynuuj wyzwanie.',
                      {
                        fontSize: 15,
                        textColor: '#64748b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.description',
                          fallback: 'Wróć do zadania i kontynuuj wyzwanie.',
                        },
                      }
                    ),
                    makeProgressBlock('kangur-game-home-assignment-spotlight-progress', {
                      progressMax: 100,
                      progressHeight: 12,
                      borderRadius: 999,
                      fillColor: '#f59e0b',
                      trackColor: '#fef3c7',
                      showPercentage: 'true',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'game.homeSpotlight.progressPercent',
                        fallback: '0',
                      },
                    }),
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-progress-label',
                      '0% ukończono',
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.progressLabel',
                          fallback: '0% ukończono',
                        },
                      }
                    ),
                    makeButtonBlock(
                      'kangur-game-home-assignment-spotlight-button',
                      'Kontynuuj zadanie',
                      {
                        runtimeActionSource: 'kangur',
                        runtimeActionPath: 'game.homeSpotlight.openAssignment',
                        buttonStyle: 'solid',
                        fontSize: 15,
                        fontWeight: '700',
                        textColor: '#ffffff',
                        bgColor: '#f97316',
                        borderColor: '#f97316',
                        borderRadius: 20,
                        borderWidth: 1,
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.actionLabel',
                          fallback: 'Kontynuuj zadanie',
                        },
                      }
                    ),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-priority-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 14,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                    ...makeGameUserVisibilitySettings('truthy'),
                  },
                  blocks: [
                    makeContainerBlock({
                      id: 'kangur-game-home-priority-header',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 10,
                      },
                      blocks: [
                        makeHeadingBlock(
                          'kangur-game-home-priority-title',
                          'Priorytetowe zadania',
                          26,
                          {
                            textColor: '#1e293b',
                          }
                        ),
                        makeTextBlock('kangur-game-home-priority-count', '0 zadań', {
                          fontSize: 14,
                          fontWeight: '700',
                          textColor: '#94a3b8',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'game.priorityAssignments.countLabel',
                            fallback: '0 zadań',
                          },
                        }),
                      ],
                    }),
                    makeRepeaterBlock(
                      'kangur-game-home-priority-list',
                      [
                        makeContainerBlock({
                          id: 'kangur-game-home-priority-item',
                          settings: {
                            paddingTop: 18,
                            paddingBottom: 18,
                            paddingLeft: 18,
                            paddingRight: 18,
                            blockGap: 10,
                            background: { type: 'solid', color: '#f8fafc' },
                            sectionBorder: {
                              width: 1,
                              style: 'solid',
                              color: '#e2e8f0',
                              radius: 22,
                            },
                          },
                          blocks: [
                            makeTextBlock(
                              'kangur-game-home-priority-item-priority',
                              'Priorytet wysoki',
                              {
                                fontSize: 12,
                                fontWeight: '700',
                                letterSpacing: 1.2,
                                textColor: '#f59e0b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'priorityLabel',
                                  fallback: 'Priorytet wysoki',
                                },
                              }
                            ),
                            makeHeadingBlock(
                              'kangur-game-home-priority-item-title',
                              'Zadanie',
                              22,
                              {
                                headingSize: 'small',
                                textColor: '#1e293b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'title',
                                  fallback: 'Zadanie',
                                },
                              }
                            ),
                            makeTextBlock(
                              'kangur-game-home-priority-item-description',
                              'Opis zadania.',
                              {
                                fontSize: 14,
                                textColor: '#64748b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'description',
                                  fallback: 'Opis zadania.',
                                },
                              }
                            ),
                            makeProgressBlock('kangur-game-home-priority-item-progress', {
                              progressMax: 100,
                              progressHeight: 10,
                              borderRadius: 999,
                              fillColor: '#6366f1',
                              trackColor: '#dbeafe',
                              showPercentage: 'true',
                              connection: {
                                enabled: true,
                                source: 'item',
                                path: 'progressPercent',
                                fallback: '0',
                              },
                            }),
                            makeTextBlock(
                              'kangur-game-home-priority-item-progress-label',
                              '0% ukończono',
                              {
                                fontSize: 13,
                                textColor: '#7a86b0',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'progressLabel',
                                  fallback: '0% ukończono',
                                },
                              }
                            ),
                            makeButtonBlock(
                              'kangur-game-home-priority-item-button',
                              'Kontynuuj zadanie',
                              {
                                runtimeActionSource: 'item',
                                runtimeActionPath: 'openAssignment',
                                buttonStyle: 'solid',
                                fontSize: 14,
                                fontWeight: '700',
                                textColor: '#ffffff',
                                bgColor: '#4f46e5',
                                borderColor: '#4f46e5',
                                borderRadius: 18,
                                borderWidth: 1,
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'actionLabel',
                                  fallback: 'Kontynuuj zadanie',
                                },
                              }
                            ),
                          ],
                        }),
                      ],
                      {
                        collectionSource: 'kangur',
                        collectionPath: 'game.priorityAssignments.items',
                        emptyMessage: 'Brak aktywnych zadań od rodzica.',
                        itemLimit: 3,
                        itemsGap: 14,
                        itemGap: 0,
                        itemLayoutDirection: 'column',
                        itemWrap: 'wrap',
                        itemAlignItems: 'stretch',
                        itemJustifyContent: 'start',
                      }
                    ),
                  ],
                }),
              ],
            }),
            makeGridColumn({
              id: 'kangur-game-home-secondary',
              blocks: [
                makeContainerBlock({
                  id: 'kangur-game-home-actions-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 12,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                  },
                  blocks: [
                    makeHeadingBlock('kangur-game-home-actions-heading', 'Co chcesz zrobić?', 26, {
                      textColor: '#1e293b',
                    }),
                    makeTextBlock(
                      'kangur-game-home-actions-copy',
                      'Ten panel jest już zlozony z bloków CMS. Zmieniaj etykiety, kolejnosc i akcje bez wracania do kodu.',
                      {
                        fontSize: 15,
                        textColor: '#7a86b0',
                      }
                    ),
                    makeButtonBlock('kangur-game-home-lessons-button', 'Lekcje', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'page.navigateToPage',
                      runtimeActionArgs: 'Lessons',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#334155',
                      bgColor: '#f8fafc',
                      borderColor: '#dbe4f3',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-play-button', 'Grajmy!', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleStartGame',
                      buttonDisabledSource: 'kangur',
                      buttonDisabledPath: 'game.canStartFromHome',
                      buttonDisabledWhen: 'falsy',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#ffffff',
                      bgColor: '#5b54f3',
                      borderColor: '#5b54f3',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-duels-button', 'Pojedynki', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'page.navigateToPage',
                      runtimeActionArgs: 'Duels',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#0f172a',
                      bgColor: '#e0f2fe',
                      borderColor: '#bae6fd',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-home-kangur-button', 'Kangur Matematyczny', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.setScreen',
                      runtimeActionArgs: 'kangur_setup',
                      buttonDisabledSource: 'kangur',
                      buttonDisabledPath: 'game.canStartFromHome',
                      buttonDisabledWhen: 'falsy',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#0f172a',
                      bgColor: '#fff1e8',
                      borderColor: '#ffd8c2',
                      borderRadius: 20,
                      borderWidth: 1,
                    }),
                  ],
                }),
                makeContainerBlock({
                  id: 'kangur-game-home-progress-panel',
                  settings: {
                    paddingTop: 24,
                    paddingBottom: 24,
                    paddingLeft: 24,
                    paddingRight: 24,
                    blockGap: 14,
                    background: { type: 'solid', color: '#ffffff' },
                    sectionBorder: {
                      width: 1,
                      style: 'solid',
                      color: '#eceff7',
                      radius: 28,
                    },
                    sectionShadow: {
                      x: 0,
                      y: 24,
                      blur: 60,
                      spread: 0,
                      color: '#a8afd82e',
                    },
                  },
                  blocks: [
                    makeHeadingBlock('kangur-game-home-progress-title', 'Raczkujacy', 28, {
                      textColor: '#1e293b',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'progress.currentLevelTitle',
                        fallback: 'Raczkujacy',
                      },
                    }),
                    makeTextBlock(
                      'kangur-game-home-progress-summary',
                      'Poziom 1 · 0 XP łącznie',
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'progress.levelSummary',
                          fallback: 'Poziom 1 · 0 XP łącznie',
                        },
                      }
                    ),
                    makeContainerBlock({
                      id: 'kangur-game-home-progress-label-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        blockGap: 12,
                      },
                      blocks: [
                        makeTextBlock('kangur-game-home-progress-current', '0 XP', {
                          fontSize: 12,
                          textColor: '#64748b',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'progress.xpIntoLevelLabel',
                            fallback: '0 XP',
                          },
                        }),
                        makeTextBlock(
                          'kangur-game-home-progress-remaining',
                          'Do poziomu 2: 100 XP',
                          {
                            fontSize: 12,
                            textAlign: 'right',
                            textColor: '#64748b',
                            connection: {
                              enabled: true,
                              source: 'kangur',
                              path: 'progress.xpToNextLevelLabel',
                              fallback: 'Do poziomu 2: 100 XP',
                            },
                          }
                        ),
                      ],
                    }),
                    makeProgressBlock('kangur-game-home-progress-bar', {
                      progressMax: 100,
                      progressHeight: 14,
                      borderRadius: 999,
                      fillColor: '#6366f1',
                      trackColor: '#e2e8f0',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'progress.levelProgressPercent',
                        fallback: '0',
                      },
                    }),
                    makeContainerBlock({
                      id: 'kangur-game-home-progress-metrics-row',
                      settings: {
                        layoutDirection: 'row',
                        wrap: 'wrap',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',
                        blockGap: 10,
                      },
                      blocks: [
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-games',
                          label: 'Gier',
                          connectionPath: 'progress.gamesPlayedLabel',
                          fillColor: '#eef2ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-lessons',
                          label: 'Lekcji',
                          connectionPath: 'progress.lessonsCompletedLabel',
                          fillColor: '#f5f3ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-badges',
                          label: 'Odznak',
                          connectionPath: 'progress.badgesUnlockedCountLabel',
                          fillColor: '#fff7ed',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('home'),
    }),
    makeBlockSection({
      id: 'kangur-game-home-leaderboard',
      blocks: [
        makeGameLeaderboardPanel({
          id: 'kangur-game-home-leaderboard',
          title: 'Najlepsze wyniki',
          description:
            'Ta tablica wyników jest teraz składana z bloków CMS. Zmieniaj filtry, teksty i wygląd bez wracania do widgetu.',
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('home'),
    }),
    makeBlockSection({
      id: 'kangur-game-training-setup',
      blocks: [makeGameTrainingSetupPanel({ id: 'kangur-game-training-setup' })],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('training'),
    }),
    makeBlockSection({
      id: 'kangur-game-kangur-setup',
      blocks: [makeWidgetBlock('kangur-widget-game-kangur-setup', 'game-kangur-setup')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('kangur_setup'),
    }),
    makeBlockSection({
      id: 'kangur-game-kangur-session',
      blocks: [makeWidgetBlock('kangur-widget-game-kangur-session', 'game-kangur-session')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('kangur'),
    }),
    makeBlockSection({
      id: 'kangur-game-calendar-training',
      blocks: [
        makeWidgetBlock('kangur-widget-game-calendar-training', 'game-calendar-training'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('calendar_quiz'),
    }),
    makeBlockSection({
      id: 'kangur-game-geometry-training',
      blocks: [
        makeWidgetBlock('kangur-widget-game-geometry-training', 'game-geometry-training'),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('geometry_quiz'),
    }),
    makeBlockSection({
      id: 'kangur-game-operation-selector',
      blocks: [makeGameOperationSelectorPanel({ id: 'kangur-game-operation-selector' })],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('operation'),
    }),
    makeBlockSection({
      id: 'kangur-game-question-session',
      blocks: [makeWidgetBlock('kangur-widget-game-question-session', 'game-question-session')],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('playing'),
    }),
    makeBlockSection({
      id: 'kangur-game-result-summary',
      blocks: [
        makeContainerBlock({
          id: 'kangur-game-result-shell',
          settings: {
            blockGap: 20,
            alignItems: 'center',
            contentAlignment: 'center',
          },
          blocks: [
            makeContainerBlock({
              id: 'kangur-game-result-assignment-card',
              settings: {
                maxWidth: 720,
                paddingTop: 24,
                paddingBottom: 24,
                paddingLeft: 24,
                paddingRight: 24,
                blockGap: 12,
                background: { type: 'solid', color: '#ffffff' },
                sectionBorder: {
                  width: 1,
                  style: 'solid',
                  color: '#eceff7',
                  radius: 28,
                },
                sectionShadow: {
                  x: 0,
                  y: 22,
                  blur: 54,
                  spread: 0,
                  color: '#8f96c924',
                },
                ...makeRuntimeVisibilitySettings({
                  mode: 'truthy',
                  path: 'game.result.hasAssignment',
                }),
              },
              blocks: [
                makeTextBlock('kangur-game-result-assignment-eyebrow', 'Zadanie od rodzica', {
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1.4,
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentEyebrow',
                    fallback: 'Zadanie od rodzica',
                  },
                }),
                makeHeadingBlock(
                  'kangur-game-result-assignment-title',
                  'Priorytetowe zadanie',
                  28,
                  {
                    textColor: '#1e293b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentTitle',
                      fallback: 'Priorytetowe zadanie',
                    },
                  }
                ),
                makeTextBlock(
                  'kangur-game-result-assignment-description',
                  'Wróć do zadania i kontynuuj wyzwanie.',
                  {
                    fontSize: 15,
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentDescription',
                      fallback: 'Wróć do zadania i kontynuuj wyzwanie.',
                    },
                  }
                ),
                makeProgressBlock('kangur-game-result-assignment-progress', {
                  progressMax: 100,
                  progressHeight: 12,
                  borderRadius: 999,
                  fillColor: '#f59e0b',
                  trackColor: '#fef3c7',
                  showPercentage: 'true',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentProgressPercent',
                    fallback: '0',
                  },
                }),
                makeTextBlock(
                  'kangur-game-result-assignment-progress-label',
                  '0% ukończono',
                  {
                    fontSize: 14,
                    textColor: '#7a86b0',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentProgressLabel',
                      fallback: '0% ukończono',
                    },
                  }
                ),
                makeButtonBlock('kangur-game-result-assignment-button', 'Kontynuuj zadanie', {
                  runtimeActionSource: 'kangur',
                  runtimeActionPath: 'game.result.openAssignment',
                  buttonStyle: 'solid',
                  fontSize: 15,
                  fontWeight: '700',
                  textColor: '#ffffff',
                  bgColor: '#f97316',
                  borderColor: '#f97316',
                  borderRadius: 20,
                  borderWidth: 1,
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentActionLabel',
                    fallback: 'Kontynuuj zadanie',
                  },
                }),
              ],
            }),
            makeContainerBlock({
              id: 'kangur-game-result-card',
              settings: {
                maxWidth: 760,
                paddingTop: 32,
                paddingBottom: 32,
                paddingLeft: 28,
                paddingRight: 28,
                blockGap: 16,
                alignItems: 'center',
                contentAlignment: 'center',
                background: { type: 'solid', color: '#ffffff' },
                sectionBorder: {
                  width: 1,
                  style: 'solid',
                  color: '#eceff7',
                  radius: 32,
                },
                sectionShadow: {
                  x: 0,
                  y: 24,
                  blur: 60,
                  spread: 0,
                  color: '#8f96c929',
                },
              },
              blocks: [
                makeTextBlock('kangur-game-result-stars', '1 / 3 gwiazdki', {
                  fontSize: 14,
                  fontWeight: '700',
                  textAlign: 'center',
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.starsLabel',
                    fallback: '1 / 3 gwiazdki',
                  },
                }),
                makeHeadingBlock('kangur-game-result-title', 'Swietna robota, Graczu!', 34, {
                  textColor: '#1e293b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.title',
                    fallback: 'Swietna robota, Graczu!',
                  },
                }),
                makeTextBlock(
                  'kangur-game-result-message',
                  'Dobra robota! Ćwiczenie czyni mistrza.',
                  {
                    fontSize: 17,
                    textAlign: 'center',
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.message',
                      fallback: 'Dobra robota! Ćwiczenie czyni mistrza.',
                    },
                  }
                ),
                makeContainerBlock({
                  id: 'kangur-game-result-metrics-row',
                  settings: {
                    layoutDirection: 'row',
                    wrap: 'wrap',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    blockGap: 10,
                  },
                  blocks: [
                    makeGameMetricCard({
                      id: 'kangur-game-result-score',
                      label: 'Wynik',
                      connectionPath: 'game.result.scoreLabel',
                      fillColor: '#eef2ff',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-accuracy',
                      label: 'Dokładność',
                      connectionPath: 'game.result.accuracyLabel',
                      fillColor: '#ecfeff',
                      textColor: '#0f766e',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-time',
                      label: 'Czas',
                      connectionPath: 'game.result.timeTakenLabel',
                      fillColor: '#fff7ed',
                      textColor: '#c2410c',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-topic',
                      label: 'Temat',
                      connectionPath: 'game.result.operationLabel',
                      fillColor: '#f5f3ff',
                      fallback: 'Trening mieszany',
                      textColor: '#6d28d9',
                      valueFontSize: 22,
                    }),
                  ],
                }),
                makeProgressBlock('kangur-game-result-progress', {
                  progressMax: 100,
                  progressHeight: 16,
                  borderRadius: 999,
                  fillColor: '#6366f1',
                  trackColor: '#e2e8f0',
                  showPercentage: 'true',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.percent',
                    fallback: '0',
                  },
                }),
                makeContainerBlock({
                  id: 'kangur-game-result-actions',
                  settings: {
                    layoutDirection: 'row',
                    wrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    blockGap: 12,
                  },
                  blocks: [
                    makeButtonBlock('kangur-game-result-restart', 'Zagraj ponownie', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleRestart',
                      buttonStyle: 'solid',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#ffffff',
                      bgColor: '#4f46e5',
                      borderColor: '#4f46e5',
                      borderRadius: 22,
                      borderWidth: 1,
                    }),
                    makeButtonBlock('kangur-game-result-home', 'Strona główna', {
                      runtimeActionSource: 'kangur',
                      runtimeActionPath: 'game.handleHome',
                      buttonStyle: 'outline',
                      fontSize: 16,
                      fontWeight: '700',
                      textColor: '#334155',
                      bgColor: '#ffffff',
                      borderColor: '#cbd5e1',
                      borderRadius: 22,
                      borderWidth: 1,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('result'),
    }),
    makeBlockSection({
      id: 'kangur-game-result-leaderboard',
      blocks: [
        makeGameLeaderboardPanel({
          id: 'kangur-game-result-leaderboard',
          title: 'Tablica wyników',
          description:
            'Po zakończeniu gry nadal możesz przebudować ten ranking z poziomu CMS buildera.',
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('result'),
    }),
  ]);
