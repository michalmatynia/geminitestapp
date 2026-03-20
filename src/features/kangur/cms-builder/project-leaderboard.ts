import type { PageComponentInput } from '@/shared/contracts/cms';
import {
  makeBlockSection,
  makeContainerBlock,
  makeHeadingBlock,
  makeRepeaterBlock,
  makeTextBlock,
} from './project-factories';
import { makeRuntimeVisibilitySettings } from './project-sections';

export const makeLeaderboardSection = (input: {
  id: string;
  title?: string;
  description?: string;
  playerFallback?: string;
  metaFallback?: string;
}): PageComponentInput =>
  makeBlockSection({
    id: input.id,
    paddingTop: 0,
    blocks: [
      makeContainerBlock({
        id: `${input.id}-header`,
        settings: {
          paddingTop: 24,
          paddingBottom: 12,
          blockGap: 4,
        },
        blocks: [
          makeHeadingBlock(`${input.id}-title`, input.title ?? 'Ranking', 24, {
            textColor: '#1e293b',
          }),
          makeTextBlock(
            `${input.id}-description`,
            input.description ?? 'Najlepsze wyniki uczniow z ostatnich 7 dni.',
            {
              fontSize: 14,
              textColor: '#64748b',
            }
          ),
        ],
      }),
      makeRepeaterBlock(
        `${input.id}-list`,
        [
          makeContainerBlock({
            id: `${input.id}-row`,
            settings: {
              paddingTop: 16,
              paddingBottom: 16,
              paddingLeft: 20,
              paddingRight: 20,
              layoutDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: { type: 'solid', color: '#ffffff' },
              sectionBorder: {
                width: 1,
                style: 'solid',
                color: '#f1f5f9',
                radius: 24,
              },
            },
            blocks: [
              makeContainerBlock({
                id: `${input.id}-row-content`,
                settings: {
                  layoutDirection: 'row',
                  alignItems: 'center',
                  blockGap: 16,
                },
                blocks: [
                  makeContainerBlock({
                    id: `${input.id}-row-rank-box`,
                    settings: {
                      paddingTop: 0,
                      paddingBottom: 0,
                      paddingLeft: 0,
                      paddingRight: 0,
                      alignItems: 'center',
                      contentAlignment: 'center',
                      justifyContent: 'center',
                      minHeight: 40,
                      maxWidth: 40,
                      background: { type: 'solid', color: '#f8fafc' },
                      sectionBorder: {
                        width: 1,
                        style: 'solid',
                        color: '#e2e8f0',
                        radius: 12,
                      },
                    },
                    blocks: [
                      makeHeadingBlock(`${input.id}-row-rank`, '#', 18, {
                        headingSize: 'small',
                        textColor: '#64748b',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'rank',
                          fallback: '#',
                        },
                      }),
                    ],
                  }),
                  makeContainerBlock({
                    id: `${input.id}-row-info`,
                    settings: {
                      blockGap: 2,
                    },
                    blocks: [
                      makeHeadingBlock(`${input.id}-row-name`, input.playerFallback ?? 'Gracz', 16, {
                        headingSize: 'small',
                        textColor: '#0f172a',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'displayName',
                          fallback: input.playerFallback ?? 'Gracz',
                        },
                      }),
                      makeContainerBlock({
                        id: `${input.id}-row-meta`,
                        settings: {
                          layoutDirection: 'row',
                          alignItems: 'center',
                          blockGap: 6,
                        },
                        blocks: [
                          makeTextBlock(`${input.id}-row-badge`, '🎲', {
                            fontSize: 13,
                            connection: {
                              enabled: true,
                              source: 'item',
                              path: 'metaLabel',
                              fallback: input.metaFallback ?? '🎲 Mieszane · Anonim',
                            },
                          }),
                        ],
                      }),
                    ],
                  }),
                  makeContainerBlock({
                    id: `${input.id}-row-right`,
                    settings: {
                      blockGap: 4,
                      alignItems: 'end',
                      contentAlignment: 'right',
                    },
                    blocks: [
                      makeHeadingBlock(`${input.id}-row-score`, '0/0', 24, {
                        headingSize: 'small',
                        textColor: '#4f46e5',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'scoreLabel',
                          fallback: '0/0',
                        },
                      }),
                      makeTextBlock(`${input.id}-row-time`, '0s', {
                        fontSize: 13,
                        textColor: '#94a3b8',
                        connection: {
                          enabled: true,
                          source: 'item',
                          path: 'timeLabel',
                          fallback: '0s',
                        },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
        {
          collectionSource: 'kangur',
          collectionPath: 'game.leaderboard.items',
          emptyMessage: '',
          itemLimit: 10,
          itemsGap: 12,
          itemGap: 0,
          itemLayoutDirection: 'column',
          itemWrap: 'wrap',
          itemAlignItems: 'stretch',
          itemJustifyContent: 'start',
          ...makeRuntimeVisibilitySettings({
            mode: 'truthy',
            path: 'game.leaderboard.hasItems',
          }),
        }
      ),
    ],
  });
