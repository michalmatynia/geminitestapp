import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import {
  KANGUR_LAUNCHABLE_GAME_CONTENT_IDS,
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  getKangurGameCatalogEntriesForLessonComponent,
  getKangurLaunchableGameContentId,
  getKangurLaunchableGameScreen,
  getKangurLaunchableGameVariant,
  isKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
  type KangurLaunchableGameContentId,
  type KangurLaunchableGameScreen,
} from '@/features/kangur/games';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';

export {
  KANGUR_LAUNCHABLE_GAME_CONTENT_IDS,
  KANGUR_LAUNCHABLE_GAME_SCREENS,
  getKangurLaunchableGameContentId,
  getKangurLaunchableGameScreen,
  getKangurLaunchableGameVariant,
  isKangurLaunchableGameContentId,
  isKangurLaunchableGameScreen,
};
export type {
  KangurLaunchableGameContentId,
  KangurLaunchableGameScreen,
};

export const getKangurLaunchableGameScreenForLessonComponent = (
  componentId: KangurLessonComponentId
): KangurLaunchableGameScreen | null => {
  const launchableEntry = getKangurGameCatalogEntriesForLessonComponent(componentId).find((entry) =>
    Boolean(entry.launchableScreen)
  );

  return launchableEntry?.launchableScreen ?? null;
};

export const buildKangurGameLaunchHref = (
  basePath: string,
  game: KangurGameDefinition
): string | null => {
  const screen = getKangurLaunchableGameScreen(game);
  if (!screen) {
    return null;
  }

  return appendKangurUrlParams(
    createPageUrl('Game', basePath),
    {
      quickStart: 'screen',
      screen,
    },
    basePath
  );
};

export const buildKangurGameLessonHref = (
  basePath: string,
  game: KangurGameDefinition
): string | null => {
  const focus = game.lessonComponentIds[0];
  if (!focus) {
    return null;
  }

  return appendKangurUrlParams(
    createPageUrl('Lessons', basePath),
    {
      focus,
    },
    basePath
  );
};
