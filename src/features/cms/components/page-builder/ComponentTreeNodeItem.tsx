/**
 * Barrel export for backwards compatibility.
 * Components have been moved to the ./tree directory for better organization.
 */
export {
  SectionNodeItem,
  SlideshowFrameNodeItem,
  RowNodeItem,
  ColumnNodeItem,
  SectionBlockNodeItem,
  BlockNodeItem,
} from './tree';

export {
  SECTION_ICONS,
  BLOCK_ICONS,
  SECTION_BLOCK_TYPES,
  CONVERTIBLE_SECTION_TYPES,
  resolveNodeLabel,
  resolveBlockLabel,
} from './tree';

export type {
  SectionNodeItemProps,
  SlideshowFrameNodeItemProps,
  RowNodeItemProps,
  ColumnNodeItemProps,
  SectionBlockNodeItemProps,
  BlockNodeItemProps,
} from './tree';
