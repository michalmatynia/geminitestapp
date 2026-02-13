import type { SectionInstance, BlockInstance, PageZone } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// Component Props Interfaces
// ---------------------------------------------------------------------------

export interface SectionNodeItemProps {
  section: SectionInstance;
  sectionIndex: number;
  moveSectionByMaster: (sectionId: string, zone: PageZone, toIndex: number) => Promise<boolean>;
  startSectionMasterDrag: (sectionId: string) => void;
  endSectionMasterDrag: () => void;
}

export interface SlideshowFrameNodeItemProps {
  frame: BlockInstance;
  index: number;
}

export interface RowNodeItemProps {
  row: BlockInstance;
  rowIndex: number;
  rowCount: number;
}

export interface ColumnNodeItemProps {
  column: BlockInstance;
  columnIndex: number;
  rowColumnCount?: number;
}

export interface SectionBlockNodeItemProps {
  block: BlockInstance;
  index: number;
}

export interface BlockNodeItemProps {
  block: BlockInstance;
  index: number;
  disableDrag?: boolean | undefined;
}
