import {
  contentBlockDefinitions,
} from './block-definitions-content';
import { layoutBlockDefinitions } from './block-definitions-layout';
import { mediaBlockDefinitions } from './block-definitions-media';

import type { BlockDefinition } from '../../../types/page-builder';

export {
  BLOCK_SECTION_ALLOWED_BLOCK_TYPES,
  COLUMN_ALLOWED_BLOCK_TYPES,
  ROW_ALLOWED_BLOCK_TYPES,
} from './block-definitions-layout';
export {
  CAROUSEL_FRAME_ALLOWED_BLOCK_TYPES,
  SLIDESHOW_FRAME_ALLOWED_BLOCK_TYPES,
} from './block-definitions-content';

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  ...layoutBlockDefinitions,
  ...contentBlockDefinitions,
  ...mediaBlockDefinitions,
};
