'use client';

import { useMemo } from 'react';

import type { TreeActionsActionsContextValue } from './useTreeActionsContext.types';

export function useTreeActionGroups({
  addBlock,
  addBlockToColumn,
  addElementToNestedBlock,
  addElementToSectionBlock,
  dropBlock,
  dropBlockToColumn,
  dropBlockToSection,
  dropBlockToRow,
  dropBlockToSlideshowFrame,
  removeBlock,
  addSection,
  removeSection,
  duplicateSection,
  toggleSectionVisibility,
  dropSectionInZone,
  dropSectionToColumn,
  dropSectionToSlideshowFrame,
  convertSectionToBlock,
  promoteBlockToSection,
  pasteSection,
  addGridRow,
  removeGridRow,
  addColumnToRow,
  removeColumnFromRow,
  selectNode,
  toggleExpand,
  autoExpand,
}: {
  addBlock: TreeActionsActionsContextValue['blockActions']['add'];
  addBlockToColumn: TreeActionsActionsContextValue['blockActions']['addToColumn'];
  addElementToNestedBlock: TreeActionsActionsContextValue['blockActions']['addElementToNestedBlock'];
  addElementToSectionBlock: TreeActionsActionsContextValue['blockActions']['addElementToSectionBlock'];
  dropBlock: TreeActionsActionsContextValue['blockActions']['drop'];
  dropBlockToColumn: TreeActionsActionsContextValue['blockActions']['dropToColumn'];
  dropBlockToSection: TreeActionsActionsContextValue['blockActions']['dropToSection'];
  dropBlockToRow: TreeActionsActionsContextValue['blockActions']['dropToRow'];
  dropBlockToSlideshowFrame: TreeActionsActionsContextValue['blockActions']['dropToSlideshowFrame'];
  removeBlock: TreeActionsActionsContextValue['blockActions']['remove'];
  addSection: TreeActionsActionsContextValue['sectionActions']['add'];
  removeSection: TreeActionsActionsContextValue['sectionActions']['remove'];
  duplicateSection: TreeActionsActionsContextValue['sectionActions']['duplicate'];
  toggleSectionVisibility: TreeActionsActionsContextValue['sectionActions']['toggleVisibility'];
  dropSectionInZone: TreeActionsActionsContextValue['sectionActions']['dropInZone'];
  dropSectionToColumn: TreeActionsActionsContextValue['sectionActions']['dropToColumn'];
  dropSectionToSlideshowFrame: TreeActionsActionsContextValue['sectionActions']['dropToSlideshowFrame'];
  convertSectionToBlock: TreeActionsActionsContextValue['sectionActions']['convertToBlock'];
  promoteBlockToSection: TreeActionsActionsContextValue['sectionActions']['promoteBlockToSection'];
  pasteSection: TreeActionsActionsContextValue['sectionActions']['paste'];
  addGridRow: TreeActionsActionsContextValue['gridActions']['addRow'];
  removeGridRow: TreeActionsActionsContextValue['gridActions']['removeRow'];
  addColumnToRow: TreeActionsActionsContextValue['gridActions']['addColumn'];
  removeColumnFromRow: TreeActionsActionsContextValue['gridActions']['removeColumn'];
  selectNode: TreeActionsActionsContextValue['selectNode'];
  toggleExpand: TreeActionsActionsContextValue['toggleExpand'];
  autoExpand: TreeActionsActionsContextValue['autoExpand'];
}) {
  const blockActions = useMemo<TreeActionsActionsContextValue['blockActions']>(
    () => ({
      add: addBlock,
      addToColumn: addBlockToColumn,
      addElementToNestedBlock,
      addElementToSectionBlock,
      drop: dropBlock,
      dropToColumn: dropBlockToColumn,
      dropToSection: dropBlockToSection,
      dropToRow: dropBlockToRow,
      dropToSlideshowFrame: dropBlockToSlideshowFrame,
      remove: removeBlock,
    }),
    [
      addBlock,
      addBlockToColumn,
      addElementToNestedBlock,
      addElementToSectionBlock,
      dropBlock,
      dropBlockToColumn,
      dropBlockToSection,
      dropBlockToRow,
      dropBlockToSlideshowFrame,
      removeBlock,
    ]
  );

  const sectionActions = useMemo<TreeActionsActionsContextValue['sectionActions']>(
    () => ({
      add: addSection,
      remove: removeSection,
      duplicate: duplicateSection,
      toggleVisibility: toggleSectionVisibility,
      dropInZone: dropSectionInZone,
      dropToColumn: dropSectionToColumn,
      dropToSlideshowFrame: dropSectionToSlideshowFrame,
      convertToBlock: convertSectionToBlock,
      promoteBlockToSection,
      paste: pasteSection,
    }),
    [
      addSection,
      removeSection,
      duplicateSection,
      toggleSectionVisibility,
      dropSectionInZone,
      dropSectionToColumn,
      dropSectionToSlideshowFrame,
      convertSectionToBlock,
      promoteBlockToSection,
      pasteSection,
    ]
  );

  const gridActions = useMemo<TreeActionsActionsContextValue['gridActions']>(
    () => ({
      addRow: addGridRow,
      removeRow: removeGridRow,
      addColumn: addColumnToRow,
      removeColumn: removeColumnFromRow,
    }),
    [addGridRow, removeGridRow, addColumnToRow, removeColumnFromRow]
  );

  const actionsValue = useMemo<TreeActionsActionsContextValue>(
    () => ({
      selectNode,
      toggleExpand,
      autoExpand,
      blockActions,
      sectionActions,
      gridActions,
    }),
    [selectNode, toggleExpand, autoExpand, blockActions, sectionActions, gridActions]
  );

  return {
    blockActions,
    sectionActions,
    gridActions,
    actionsValue,
  };
}
