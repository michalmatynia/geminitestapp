// Re-export everything from sub-modules so existing imports keep working
export {
  COLOR_SCHEME_OPTIONS,
  OVERFLOW_OPTIONS,
  JUSTIFY_OPTIONS,
  ALIGN_OPTIONS,
  WRAP_OPTIONS,
  colorSchemeField,
  colorSchemeFieldWithNone,
  paddingFields,
  marginFields,
  layoutFields,
  sectionStyleFields,
} from './registry/shared-field-helpers';

export {
  COLUMN_ALLOWED_BLOCK_TYPES,
  BLOCK_SECTION_ALLOWED_BLOCK_TYPES,
  ROW_ALLOWED_BLOCK_TYPES,
  CAROUSEL_FRAME_ALLOWED_BLOCK_TYPES,
  SLIDESHOW_FRAME_ALLOWED_BLOCK_TYPES,
  BLOCK_DEFINITIONS,
} from './registry/block-definitions';

export { SECTION_DEFINITIONS } from './registry/section-definitions';

// Local imports for use in the helpers below
import { BLOCK_DEFINITIONS } from './registry/block-definitions';
import { COLUMN_ALLOWED_BLOCK_TYPES, ROW_ALLOWED_BLOCK_TYPES } from './registry/block-definitions';
import { SECTION_DEFINITIONS } from './registry/section-definitions';

import type { SectionDefinition, BlockDefinition, PageZone } from '../../types/page-builder';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function getSectionDefinition(type: string): SectionDefinition | undefined {
  const def = SECTION_DEFINITIONS[type];
  if (!def) {
    logClientCatch(new Error(`Section definition not found: ${type}`), {
      source: 'cms.section-registry',
      action: 'getSectionDefinition',
      type,
    });
  }
  return def;
}

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  const def = BLOCK_DEFINITIONS[type];
  if (!def) {
    logClientCatch(new Error(`Block definition not found: ${type}`), {
      source: 'cms.section-registry',
      action: 'getBlockDefinition',
      type,
    });
  }
  return def;
}

export function getAllSectionTypes(): SectionDefinition[] {
  return Object.values(SECTION_DEFINITIONS);
}

const SECTION_TYPES_BY_ZONE: Record<PageZone, string[]> = {
  header: [
    'AnnouncementBar',
    'Block',
    'TextElement',
    'TextAtom',
    'ImageElement',
    'Model3DElement',
    'ButtonElement',
    'Hero',
    'ImageWithText',
    'RichText',
    'Grid',
    'Slideshow',
  ],
  template: Object.keys(SECTION_DEFINITIONS).filter((type: string) => type !== 'AnnouncementBar'),
  footer: [
    'Block',
    'TextElement',
    'TextAtom',
    'ImageElement',
    'Model3DElement',
    'ButtonElement',
    'RichText',
    'Grid',
    'Newsletter',
    'ContactForm',
  ],
};

export function getSectionTypesForZone(zone: PageZone): SectionDefinition[] {
  const types = SECTION_TYPES_BY_ZONE[zone] ?? Object.keys(SECTION_DEFINITIONS);
  return types
    .map((type: string) => SECTION_DEFINITIONS[type])
    .filter((def: SectionDefinition | undefined): def is SectionDefinition => def !== undefined);
}

export function getAllowedBlockTypes(sectionType: string): BlockDefinition[] {
  const def = getSectionDefinition(sectionType);
  if (!def) return [];
  return def.allowedBlockTypes
    .map((bt: string) => BLOCK_DEFINITIONS[bt])
    .filter((b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined);
}

export function getColumnAllowedBlockTypes(): BlockDefinition[] {
  return COLUMN_ALLOWED_BLOCK_TYPES.map((bt: string) => BLOCK_DEFINITIONS[bt]).filter(
    (b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined
  );
}

export function getRowAllowedBlockTypes(): BlockDefinition[] {
  return ROW_ALLOWED_BLOCK_TYPES.map((bt: string) => BLOCK_DEFINITIONS[bt]).filter(
    (b: BlockDefinition | undefined): b is BlockDefinition => b !== undefined
  );
}

export function isBlockTypeAllowedInRow(blockType: string): boolean {
  return ROW_ALLOWED_BLOCK_TYPES.includes(blockType);
}
