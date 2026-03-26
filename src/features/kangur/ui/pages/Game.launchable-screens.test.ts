import { describe, expect, it } from 'vitest';

import {
  getKangurLaunchableGameScreenComponentConfig,
  KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS,
} from './Game.launchable-screens';
import { KANGUR_LAUNCHABLE_GAME_SCREENS } from '@/features/kangur/ui/services/game-launch';

describe('Game launchable screen registry', () => {
  it('covers every launchable fullscreen game screen', () => {
    expect(Object.keys(KANGUR_LAUNCHABLE_GAME_SCREEN_COMPONENTS).sort()).toEqual(
      [...KANGUR_LAUNCHABLE_GAME_SCREENS].sort()
    );

    for (const screen of KANGUR_LAUNCHABLE_GAME_SCREENS) {
      const config = getKangurLaunchableGameScreenComponentConfig(screen);

      expect(config.className).toContain('w-full');
      expect(config.Component).toBeTruthy();
      expect(config.runtime.screen).toBe(screen);
      expect(config.runtime.rendererId).toBeTruthy();
    }
  });
});
