import type { PageComponentInput } from '@/shared/contracts/cms';
import { withOrders } from '../project-factories';
import { createDefaultGameScreenPrimaryComponents } from './game-defaults.primary';
import { createDefaultGameScreenResultComponents } from './game-defaults.result';

export * from './game-defaults.helpers';

export const createDefaultGameScreenComponents = (
  locale?: string | null
): PageComponentInput[] =>
  withOrders([
    ...createDefaultGameScreenPrimaryComponents(locale),
    ...createDefaultGameScreenResultComponents(locale),
  ]);
