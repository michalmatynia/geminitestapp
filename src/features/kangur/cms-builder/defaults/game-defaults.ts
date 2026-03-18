import type { PageComponentInput } from '@/shared/contracts/cms';
import { withOrders } from '../project-factories';
import { GAME_SCREEN_COMPONENTS_PRIMARY } from './game-defaults.primary';
import { GAME_SCREEN_COMPONENTS_RESULT } from './game-defaults.result';

export * from './game-defaults.helpers';

export const createDefaultGameScreenComponents = (): PageComponentInput[] =>
  withOrders([...GAME_SCREEN_COMPONENTS_PRIMARY, ...GAME_SCREEN_COMPONENTS_RESULT]);
