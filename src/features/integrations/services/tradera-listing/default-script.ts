import { buildPart1, PART_1 } from './script-partials/part-1';
import { PART_1B } from './script-partials/part-1b';
import { PART_2 } from './script-partials/part-2';
import { PART_3 } from './script-partials/part-3';
import { PART_3B } from './script-partials/part-3b';
import { PART_4 } from './script-partials/part-4';
import { PART_4C } from './script-partials/part-4c';
import { PART_4B } from './script-partials/part-4b';
import { PART_4D } from './script-partials/part-4d';
import { PART_5 } from './script-partials/part-5';
import { PART_5B } from './script-partials/part-5b';

export const buildDefaultTraderaQuicklistScript = (
  selectorRegistryRuntime?: string,
  quicklistStepsInit?: string
): string =>
  [
    selectorRegistryRuntime !== undefined || quicklistStepsInit !== undefined
      ? buildPart1(selectorRegistryRuntime, quicklistStepsInit)
      : PART_1,
    PART_1B,
    PART_2,
    PART_3,
    PART_3B,
    PART_4,
    PART_4C,
    PART_4B,
    PART_4D,
    PART_5,
    PART_5B,
  ].join('');

export const DEFAULT_TRADERA_QUICKLIST_SCRIPT = buildDefaultTraderaQuicklistScript();
