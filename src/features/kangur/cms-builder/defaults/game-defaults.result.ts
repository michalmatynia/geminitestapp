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
import { resolveKangurCmsDefaultsCopy } from './defaults-i18n';

export const createDefaultGameScreenResultComponents = (
  locale?: string | null
): PageComponentInput[] => {
  const copy = resolveKangurCmsDefaultsCopy(locale);

  return [
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
                makeTextBlock('kangur-game-result-assignment-eyebrow', copy.game.result.assignmentEyebrow, {
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1.4,
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.assignmentEyebrow',
                    fallback: copy.game.result.assignmentEyebrow,
                  },
                }),
                makeHeadingBlock(
                  'kangur-game-result-assignment-title',
                  copy.game.result.assignmentTitle,
                  28,
                  {
                    textColor: '#1e293b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentTitle',
                      fallback: copy.game.result.assignmentTitle,
                    },
                  }
                ),
                makeTextBlock(
                  'kangur-game-result-assignment-description',
                  copy.game.result.assignmentDescription,
                  {
                    fontSize: 15,
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentDescription',
                      fallback: copy.game.result.assignmentDescription,
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
                  copy.game.result.assignmentProgressLabel,
                  {
                    fontSize: 14,
                    textColor: '#7a86b0',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.assignmentProgressLabel',
                      fallback: copy.game.result.assignmentProgressLabel,
                    },
                  }
                ),
                makeButtonBlock('kangur-game-result-assignment-button', copy.game.result.assignmentActionLabel, {
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
                    fallback: copy.game.result.assignmentActionLabel,
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
                makeTextBlock('kangur-game-result-stars', copy.game.result.starsLabel, {
                  fontSize: 14,
                  fontWeight: '700',
                  textAlign: 'center',
                  textColor: '#f59e0b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.starsLabel',
                    fallback: copy.game.result.starsLabel,
                  },
                }),
                makeHeadingBlock('kangur-game-result-title', copy.game.result.title, 34, {
                  textColor: '#1e293b',
                  connection: {
                    enabled: true,
                    source: 'kangur',
                    path: 'game.result.title',
                    fallback: copy.game.result.title,
                  },
                }),
                makeTextBlock(
                  'kangur-game-result-message',
                  copy.game.result.message,
                  {
                    fontSize: 17,
                    textAlign: 'center',
                    textColor: '#64748b',
                    connection: {
                      enabled: true,
                      source: 'kangur',
                      path: 'game.result.message',
                      fallback: copy.game.result.message,
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
                      label: copy.game.result.scoreMetric,
                      connectionPath: 'game.result.scoreLabel',
                      fillColor: '#eef2ff',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-accuracy',
                      label: copy.game.result.accuracyMetric,
                      connectionPath: 'game.result.accuracyLabel',
                      fillColor: '#ecfeff',
                      textColor: '#0f766e',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-time',
                      label: copy.game.result.timeMetric,
                      connectionPath: 'game.result.timeTakenLabel',
                      fillColor: '#fff7ed',
                      textColor: '#c2410c',
                    }),
                    makeGameMetricCard({
                      id: 'kangur-game-result-topic',
                      label: copy.game.result.topicMetric,
                      connectionPath: 'game.result.operationLabel',
                      fillColor: '#f5f3ff',
                      fallback: copy.game.result.topicFallback,
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
                    makeButtonBlock('kangur-game-result-restart', copy.game.result.restartLabel, {
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
                    makeButtonBlock('kangur-game-result-home', copy.game.result.homeLabel, {
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
          title: copy.game.result.leaderboardTitle,
          description: copy.game.result.leaderboardDescription,
          locale: locale ?? undefined,
        }),
      ],
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      settings: makeGameScreenVisibilitySettings('result'),
    }),
  ];
};
