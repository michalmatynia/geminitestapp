import type { SectionInstance, BlockInstance } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// Common Callback Types
// ---------------------------------------------------------------------------

export type SelectNodeCallback = (nodeId: string) => void;
export type ToggleExpandCallback = (nodeId: string) => void;

export type AddBlockCallback = (sectionId: string, blockType: string) => void;
export type AddBlockToColumnCallback = (sectionId: string, columnId: string, blockType: string) => void;
export type AddElementToNestedBlockCallback = (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
export type AddElementToSectionBlockCallback = (sectionId: string, parentBlockId: string, elementType: string) => void;

export type DropBlockCallback = (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
export type DropBlockToColumnCallback = (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
export type DropBlockToSectionCallback = (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toIndex: number, fromParentBlockId?: string) => void;
export type DropBlockToRowCallback = (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toRowId: string, toIndex: number, fromParentBlockId?: string) => void;
export type DropBlockToSlideshowFrameCallback = (blockId: string, fromSectionId: string, fromColumnId: string | undefined, fromParentBlockId: string | undefined, toSectionId: string, toFrameId: string, toIndex: number) => void;

export type DropSectionCallback = (sectionId: string, toIndex: number) => void;
export type DropSectionToColumnCallback = (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
export type DropSectionToSlideshowFrameCallback = (sectionId: string, toSectionId: string, toFrameId: string, toIndex: number) => void;
export type ConvertSectionToBlockCallback = (sectionId: string, toSectionId: string, toIndex: number) => void;

export type RemoveBlockCallback = (sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void;
export type RemoveSectionCallback = (sectionId: string) => void;
export type ToggleSectionVisibilityCallback = (sectionId: string, isHidden: boolean) => void;

export type AddGridRowCallback = (sectionId: string) => void;
export type RemoveGridRowCallback = (sectionId: string, rowId: string) => void;
export type AddColumnToRowCallback = (sectionId: string, rowId: string) => void;
export type RemoveColumnFromRowCallback = (sectionId: string, columnId: string, rowId?: string) => void;

// ---------------------------------------------------------------------------
// Component Props Interfaces
// ---------------------------------------------------------------------------

export interface SectionNodeItemProps {
  section: SectionInstance;
  sectionIndex: number;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onAddBlock: AddBlockCallback;
  onDropBlock: DropBlockCallback;
  onDropBlockToSection: DropBlockToSectionCallback;
  onAddBlockToColumn: AddBlockToColumnCallback;
  onDropBlockToColumn: DropBlockToColumnCallback;
  onAddGridRow: AddGridRowCallback;
  onRemoveGridRow: RemoveGridRowCallback;
  onAddColumnToRow: AddColumnToRowCallback;
  onRemoveColumnFromRow: RemoveColumnFromRowCallback;
  onAddElementToNestedBlock: AddElementToNestedBlockCallback;
  onAddElementToSectionBlock: AddElementToSectionBlockCallback;
  onDropSection: DropSectionCallback;
  onToggleSectionVisibility: ToggleSectionVisibilityCallback;
  onRemoveSection: RemoveSectionCallback;
  onConvertSectionToBlock: ConvertSectionToBlockCallback;
  expandedIds: Set<string>;
  onToggleExpand: ToggleExpandCallback;
  onDropBlockToRow: DropBlockToRowCallback;
  onDropSectionToColumn: DropSectionToColumnCallback;
  onDropBlockToSlideshowFrame: DropBlockToSlideshowFrameCallback;
  onDropSectionToSlideshowFrame: DropSectionToSlideshowFrameCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
}

export interface SlideshowFrameNodeItemProps {
  frame: BlockInstance;
  index: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onAddElementToSectionBlock: AddElementToSectionBlockCallback;
  onDropBlock: DropBlockCallback;
  onDropBlockToSlideshowFrame: DropBlockToSlideshowFrameCallback;
  onDropSectionToSlideshowFrame: DropSectionToSlideshowFrameCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
  expandedIds: Set<string>;
  onToggleExpand: ToggleExpandCallback;
}

export interface RowNodeItemProps {
  row: BlockInstance;
  rowIndex: number;
  rowCount: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onAddColumnToRow: AddColumnToRowCallback;
  onRemoveGridRow: RemoveGridRowCallback;
  onRemoveColumnFromRow: RemoveColumnFromRowCallback;
  onAddBlockToColumn: AddBlockToColumnCallback;
  onDropBlockToColumn: DropBlockToColumnCallback;
  onDropBlockToRow: DropBlockToRowCallback;
  onAddElementToNestedBlock: AddElementToNestedBlockCallback;
  expandedIds: Set<string>;
  onToggleExpand: ToggleExpandCallback;
  onDropSectionToColumn: DropSectionToColumnCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
}

export interface ColumnNodeItemProps {
  column: BlockInstance;
  columnIndex: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onAddBlockToColumn: AddBlockToColumnCallback;
  onDropBlockToColumn: DropBlockToColumnCallback;
  onAddElementToNestedBlock: AddElementToNestedBlockCallback;
  onRemoveColumnFromRow: RemoveColumnFromRowCallback;
  rowId?: string;
  rowColumnCount?: number;
  expandedIds: Set<string>;
  onToggleExpand: ToggleExpandCallback;
  onDropSectionToColumn: DropSectionToColumnCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
}

export interface SectionBlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId: string;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onAddElementToNestedBlock: AddElementToNestedBlockCallback;
  onDropBlockToColumn: DropBlockToColumnCallback;
  expandedIds: Set<string>;
  onToggleExpand: ToggleExpandCallback;
  onDropSectionToColumn: DropSectionToColumnCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
}

export interface BlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId?: string;
  parentBlockId?: string;
  selectedNodeId: string | null;
  onSelect: SelectNodeCallback;
  onDropBlock: DropBlockCallback;
  onDropBlockToColumn?: DropBlockToColumnCallback;
  onDropBlockToSection?: DropBlockToSectionCallback;
  onRemoveBlock?: RemoveBlockCallback | undefined;
  disableDrag?: boolean | undefined;
}
