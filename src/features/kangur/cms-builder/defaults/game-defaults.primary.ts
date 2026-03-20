import type { PageComponentInput } from '@/shared/contracts/cms';
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
} from '../project-factories';
import {
  makeGridColumn,
  makeGridRow,
  makeGridSection,
  makeGameMetricCard,
  makeGameUserVisibilitySettings,
  makeRuntimeVisibilitySettings,
} from '../project-sections';
import {
  makeGameLeaderboardPanel,
  makeGameOperationSelectorPanel,
  makeGameScreenVisibilitySettings,
  makeGameTrainingSetupPanel,
} from './game-defaults.helpers';
import { resolveKangurCmsDefaultsCopy } from './defaults-i18n';

export const createDefaultGameScreenPrimaryComponents = (
  locale?: string | null
): PageComponentInput[] => {
  const copy = resolveKangurCmsDefaultsCopy(locale);

  return [
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
                    makeTextBlock('kangur-game-home-guest-label', copy.game.guest.playerLabel, {
                      fontSize: 14,
                      fontWeight: '700',
                      letterSpacing: 1.8,
                      textColor: '#97a0c3',
                    }),
                    makeInputBlock('kangur-game-home-guest-name', {
                      inputPlaceholder: copy.game.guest.playerPlaceholder,
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
                          copy.game.guest.loginCopy,
                          {
                            fontSize: 15,
                            textColor: '#8c97bb',
                          }
                        ),
                        makeButtonBlock('kangur-game-home-guest-login-button', copy.game.guest.loginButton, {
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
                      copy.game.spotlight.priority,
                      {
                        fontSize: 12,
                        fontWeight: '700',
                        letterSpacing: 1.4,
                        textColor: '#f59e0b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.priorityLabel',
                          fallback: copy.game.spotlight.priority,
                        },
                      }
                    ),
                    makeHeadingBlock(
                      'kangur-game-home-assignment-spotlight-title',
                      copy.game.spotlight.title,
                      28,
                      {
                        textColor: '#1e293b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.title',
                          fallback: copy.game.spotlight.title,
                        },
                      }
                    ),
                    makeTextBlock(
                      'kangur-game-home-assignment-spotlight-description',
                      copy.game.spotlight.description,
                      {
                        fontSize: 15,
                        textColor: '#64748b',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.description',
                          fallback: copy.game.spotlight.description,
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
                      copy.game.spotlight.progressLabel,
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'game.homeSpotlight.progressLabel',
                          fallback: copy.game.spotlight.progressLabel,
                        },
                      }
                    ),
                    makeButtonBlock(
                      'kangur-game-home-assignment-spotlight-button',
                      copy.game.spotlight.actionLabel,
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
                          fallback: copy.game.spotlight.actionLabel,
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
                          copy.game.priorityPanel.title,
                          26,
                          {
                            textColor: '#1e293b',
                          }
                        ),
                        makeTextBlock('kangur-game-home-priority-count', copy.game.priorityPanel.countLabel, {
                          fontSize: 14,
                          fontWeight: '700',
                          textColor: '#94a3b8',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'game.priorityAssignments.countLabel',
                            fallback: copy.game.priorityPanel.countLabel,
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
                              copy.game.priorityPanel.itemPriority,
                              {
                                fontSize: 12,
                                fontWeight: '700',
                                letterSpacing: 1.2,
                                textColor: '#f59e0b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'priorityLabel',
                                  fallback: copy.game.priorityPanel.itemPriority,
                                },
                              }
                            ),
                            makeHeadingBlock(
                              'kangur-game-home-priority-item-title',
                              copy.game.priorityPanel.itemTitle,
                              22,
                              {
                                headingSize: 'small',
                                textColor: '#1e293b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'title',
                                  fallback: copy.game.priorityPanel.itemTitle,
                                },
                              }
                            ),
                            makeTextBlock(
                              'kangur-game-home-priority-item-description',
                              copy.game.priorityPanel.itemDescription,
                              {
                                fontSize: 14,
                                textColor: '#64748b',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'description',
                                  fallback: copy.game.priorityPanel.itemDescription,
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
                              copy.game.priorityPanel.itemProgressLabel,
                              {
                                fontSize: 13,
                                textColor: '#7a86b0',
                                connection: {
                                  enabled: true,
                                  source: 'item',
                                  path: 'progressLabel',
                                  fallback: copy.game.priorityPanel.itemProgressLabel,
                                },
                              }
                            ),
                            makeButtonBlock(
                              'kangur-game-home-priority-item-button',
                              copy.game.priorityPanel.itemActionLabel,
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
                                  fallback: copy.game.priorityPanel.itemActionLabel,
                                },
                              }
                            ),
                          ],
                        }),
                      ],
                      {
                        collectionSource: 'kangur',
                        collectionPath: 'game.priorityAssignments.items',
                        emptyMessage: copy.game.priorityPanel.emptyMessage,
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
                    makeHeadingBlock('kangur-game-home-actions-heading', copy.game.actions.title, 26, {
                      textColor: '#1e293b',
                    }),
                    makeTextBlock(
                      'kangur-game-home-actions-copy',
                      copy.game.actions.description,
                      {
                        fontSize: 15,
                        textColor: '#7a86b0',
                      }
                    ),
                    makeButtonBlock('kangur-game-home-lessons-button', copy.game.actions.lessonsLabel, {
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
                    makeButtonBlock('kangur-game-home-play-button', copy.game.actions.playLabel, {
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
                    makeButtonBlock('kangur-game-home-duels-button', copy.game.actions.duelsLabel, {
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
                    makeButtonBlock('kangur-game-home-kangur-button', copy.game.actions.kangurLabel, {
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
                    makeHeadingBlock('kangur-game-home-progress-title', copy.game.progress.levelTitle, 28, {
                      textColor: '#1e293b',
                      connection: {
                        enabled: true,
                        source: 'kangur',
                        path: 'progress.currentLevelTitle',
                        fallback: copy.game.progress.levelTitle,
                      },
                    }),
                    makeTextBlock(
                      'kangur-game-home-progress-summary',
                      copy.game.progress.summary,
                      {
                        fontSize: 14,
                        textColor: '#7a86b0',
                        connection: {
                          enabled: true,
                          source: 'kangur',
                          path: 'progress.levelSummary',
                          fallback: copy.game.progress.summary,
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
                        makeTextBlock('kangur-game-home-progress-current', copy.game.progress.currentXp, {
                          fontSize: 12,
                          textColor: '#64748b',
                          connection: {
                            enabled: true,
                            source: 'kangur',
                            path: 'progress.xpIntoLevelLabel',
                            fallback: copy.game.progress.currentXp,
                          },
                        }),
                        makeTextBlock(
                          'kangur-game-home-progress-remaining',
                          copy.game.progress.remainingXp,
                          {
                            fontSize: 12,
                            textAlign: 'right',
                            textColor: '#64748b',
                            connection: {
                              enabled: true,
                              source: 'kangur',
                              path: 'progress.xpToNextLevelLabel',
                              fallback: copy.game.progress.remainingXp,
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
                          label: copy.game.progress.gamesLabel,
                          connectionPath: 'progress.gamesPlayedLabel',
                          fillColor: '#eef2ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-lessons',
                          label: copy.game.progress.lessonsLabel,
                          connectionPath: 'progress.lessonsCompletedLabel',
                          fillColor: '#f5f3ff',
                        }),
                        makeGameMetricCard({
                          id: 'kangur-game-home-progress-badges',
                          label: copy.game.progress.badgesLabel,
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
          title: copy.game.homeLeaderboard.title,
          description: copy.game.homeLeaderboard.description,
          locale: locale ?? undefined,
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
      blocks: [
        makeGameTrainingSetupPanel({
          id: 'kangur-game-training-setup',
          locale: locale ?? undefined,
        }),
      ],
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
      blocks: [
        makeGameOperationSelectorPanel({
          id: 'kangur-game-operation-selector',
          locale: locale ?? undefined,
        }),
      ],
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
  ];
};
