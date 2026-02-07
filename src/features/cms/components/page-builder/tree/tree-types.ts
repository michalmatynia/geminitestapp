import type { SectionInstance, BlockInstance } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// Component Props Interfaces
// ---------------------------------------------------------------------------

export interface SectionNodeItemProps {
  section: SectionInstance;
  sectionIndex: number;
}

export interface SlideshowFrameNodeItemProps {
  frame: BlockInstance;
  index: number;
  sectionId: string;
}

export interface RowNodeItemProps {
  row: BlockInstance;
  rowIndex: number;
  rowCount: number;
  sectionId: string;
}

export interface ColumnNodeItemProps {
  column: BlockInstance;
  columnIndex: number;
  sectionId: string;
  rowId?: string;
  rowColumnCount?: number;
}

export interface SectionBlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId: string;
}

export interface BlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId?: string;
  parentBlockId?: string;
  disableDrag?: boolean | undefined;
}