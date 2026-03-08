import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { PageZone } from '../types/page-builder';

export interface TreeActionsStateContextValue {
  expandedIds: Set<string>;
}

export interface TreeActionsActionsContextValue {
  selectNode: (nodeId: string) => void;
  toggleExpand: (nodeId: string) => void;
  autoExpand: (...nodeIds: (string | string[] | null | undefined)[]) => void;
  blockActions: {
    add: (sectionId: string, blockType: string) => void;
    addToColumn: (sectionId: string, columnId: string, blockType: string) => void;
    addElementToNestedBlock: (
      sectionId: string,
      columnId: string,
      parentBlockId: string,
      elementType: string
    ) => void;
    addElementToSectionBlock: (
      sectionId: string,
      parentBlockId: string,
      elementType: string
    ) => void;
    drop: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
    dropToColumn: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => void;
    dropToSection: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => void;
    dropToRow: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      toSectionId: string,
      toRowId: string,
      toIndex: number,
      fromParentBlockId?: string,
      toParentBlockId?: string
    ) => void;
    dropToSlideshowFrame: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toSectionId: string,
      toFrameId: string,
      toIndex: number
    ) => void;
    remove: (sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void;
  };
  sectionActions: {
    add: (sectionType: string, zone: PageZone) => void;
    remove: (sectionId: string) => void;
    duplicate: (sectionId: string) => void;
    toggleVisibility: (sectionId: string, isHidden: boolean) => void;
    dropInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
    dropToColumn: (
      sectionId: string,
      toSectionId: string,
      toColumnId: string,
      toIndex: number,
      toParentBlockId?: string
    ) => void;
    dropToSlideshowFrame: (
      sectionId: string,
      toSectionId: string,
      toFrameId: string,
      toIndex: number
    ) => void;
    convertToBlock: (sectionId: string, toSectionId: string, toIndex: number) => void;
    promoteBlockToSection: (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toZone: PageZone,
      toIndex: number
    ) => void;
    paste: (zone: PageZone) => void;
  };
  gridActions: {
    addRow: (sectionId: string) => void;
    removeRow: (sectionId: string, rowId: string) => void;
    addColumn: (sectionId: string, rowId: string) => void;
    removeColumn: (sectionId: string, columnId: string, rowId?: string) => void;
  };
}

export type TreeActionsContextValue = TreeActionsStateContextValue & TreeActionsActionsContextValue;

export interface TreeActionsProviderProps {
  children: ReactNode;
  expandedIds: Set<string>;
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>;
}
