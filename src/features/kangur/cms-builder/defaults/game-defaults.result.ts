import type { PageComponentInput } from '@/shared/contracts/cms';
import {
  makeBlockSection,
  makeButtonBlock,
  makeContainerBlock,
  makeHeadingBlock,
  makeProgressBlock,
  makeTextBlock,
} from '../project-factories';
import { makeGameMetricCard, makeRuntimeVisibilitySettings } from '../project-sections';
import { makeGameLeaderboardPanel, makeGameScreenVisibilitySettings } from './game-defaults.helpers';

export const GAME_SCREEN_COMPONENTS_RESULT: PageComponentInput[] = [
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
];
