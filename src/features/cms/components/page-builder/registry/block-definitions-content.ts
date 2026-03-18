import type { BlockDefinition } from '@/features/cms/types/page-builder';

import { contentControlBlockDefinitions } from './block-definitions-content.controls';
import { contentLayoutBlockDefinitions } from './block-definitions-content.layout';
import { contentSectionBlockDefinitions } from './block-definitions-content.sections';
import { contentTextBlockDefinitions } from './block-definitions-content.text';

export {
  CAROUSEL_FRAME_ALLOWED_BLOCK_TYPES,
  SLIDESHOW_FRAME_ALLOWED_BLOCK_TYPES,
} from './block-definitions-content.constants';

export const contentBlockDefinitions: Record<string, BlockDefinition> = {
  ...contentLayoutBlockDefinitions,
  ...contentTextBlockDefinitions,
  ...contentControlBlockDefinitions,
  ...contentSectionBlockDefinitions,
};
