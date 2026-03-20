import type { BlockInstance } from '@/shared/contracts/cms';
import {
  makeContainerBlock,
  makeHeadingBlock,
  makeTextBlock,
  makeWidgetBlock,
} from '../project-factories';
import { resolveKangurCmsDefaultsCopy } from './defaults-i18n';
import { makeRuntimeVisibilitySettings } from '../project-sections';
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
  locale?: string;
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
      makeLeaderboardSection({
        id: `${input.id}-ranking`,
        title: resolveKangurCmsDefaultsCopy(input.locale).shared.leaderboard.title,
        description: resolveKangurCmsDefaultsCopy(input.locale).shared.leaderboard.description,
        playerFallback: resolveKangurCmsDefaultsCopy(input.locale).shared.leaderboard.playerFallback,
        metaFallback: resolveKangurCmsDefaultsCopy(input.locale).shared.leaderboard.metaFallback,
      }).content.blocks[1] as BlockInstance,
    ],
  });

export const makeGameTrainingSetupPanel = (input: { id: string; locale?: string }): BlockInstance =>
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
      makeHeadingBlock(
        `${input.id}-title`,
        resolveKangurCmsDefaultsCopy(input.locale).shared.trainingSetupTitle,
        26,
        {
        textColor: '#1e293b',
        }
      ),
      makeWidgetBlock(`${input.id}-widget`, 'game-training-setup'),
    ],
  });

export const makeGameOperationSelectorPanel = (input: {
  id: string;
  locale?: string;
}): BlockInstance =>
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
      makeHeadingBlock(
        `${input.id}-title`,
        resolveKangurCmsDefaultsCopy(input.locale).shared.operationSelectorTitle,
        26,
        {
        textColor: '#1e293b',
        }
      ),
      makeWidgetBlock(`${input.id}-widget`, 'game-operation-selector'),
    ],
  });
