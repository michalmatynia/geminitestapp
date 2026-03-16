import { useCallback } from 'react';

import {
  cloneKangurLessonPage,
  cloneKangurLessonRootBlock,
  createKangurLessonDocumentFromTemplate,
  createKangurLessonPage,
  reorderKangurLessonBlocks,
  resolveKangurLessonDocumentPages,
  updateKangurLessonDocumentPages,
  type KangurLessonDocumentTemplateId,
} from '@/features/kangur/lesson-documents';
import type {
  KangurLessonDocument,
  KangurLessonRootBlock,
  KangurLessonPage,
  KangurLessonGridBlock,
} from '@/features/kangur/shared/contracts/kangur';

import { insertAfterIndex, moveItem, resolvePageSectionOptions } from '../utils';

export function useKangurLessonMutations(
  value: KangurLessonDocument,
  onChange: (document: KangurLessonDocument) => void,
  activePage: KangurLessonPage | null,
  pages: KangurLessonPage[],
  activePageIndex: number,
  setActivePageId: (id: string | null) => void
) {
  const applyPages = useCallback(
    (nextPages: KangurLessonPage[]): void => {
      const nextDocument = updateKangurLessonDocumentPages(value, nextPages);
      onChange({
        ...nextDocument,
        updatedAt: new Date().toISOString(),
      });
    },
    [onChange, value]
  );

  const updatePage = useCallback(
    (pageId: string, updater: (page: KangurLessonPage) => KangurLessonPage): void => {
      applyPages(pages.map((page) => (page.id === pageId ? updater(page) : page)));
    },
    [applyPages, pages]
  );

  const updateDocument = useCallback(
    (nextBlocks: KangurLessonRootBlock[]): void => {
      if (!activePage) return;
      updatePage(activePage.id, (page) => ({
        ...page,
        blocks: nextBlocks,
      }));
    },
    [activePage, updatePage]
  );

  const updateRootBlock = useCallback(
    (blockId: string, nextBlock: KangurLessonRootBlock): void => {
      if (!activePage) return;
      updateDocument(activePage.blocks.map((block) => (block.id === blockId ? nextBlock : block)));
    },
    [activePage, updateDocument]
  );

  const removeRootBlock = useCallback(
    (blockId: string): void => {
      if (!activePage) return;
      updateDocument(activePage.blocks.filter((block) => block.id !== blockId));
    },
    [activePage, updateDocument]
  );

  const moveRootBlock = useCallback(
    (fromIndex: number, toIndex: number): void => {
      if (!activePage) return;
      updateDocument(moveItem(activePage.blocks, fromIndex, toIndex));
    },
    [activePage, updateDocument]
  );

  const handleBlockReorder = useCallback(
    (draggedId: string, targetId: string, position: 'before' | 'after'): void => {
      if (!activePage) return;
      updateDocument(reorderKangurLessonBlocks(activePage.blocks, draggedId, targetId, position));
    },
    [activePage, updateDocument]
  );

  const duplicateRootBlock = useCallback(
    (index: number): void => {
      if (!activePage) return;
      const blockToClone = activePage.blocks[index];
      if (!blockToClone) return;
      updateDocument(
        insertAfterIndex(activePage.blocks, index, cloneKangurLessonRootBlock(blockToClone))
      );
    },
    [activePage, updateDocument]
  );

  const updateGridBlock = useCallback(
    (blockId: string, updater: (block: KangurLessonGridBlock) => KangurLessonGridBlock): void => {
      if (!activePage) return;
      updateDocument(
        activePage.blocks.map((block) => {
          if (block.id !== blockId || block.type !== 'grid') return block;
          return updater(block);
        })
      );
    },
    [activePage, updateDocument]
  );

  const replaceWithDocumentTemplate = useCallback(
    (templateId: KangurLessonDocumentTemplateId): void => {
      const nextDocument = createKangurLessonDocumentFromTemplate(templateId);
      onChange({
        ...nextDocument,
        updatedAt: new Date().toISOString(),
      });
      setActivePageId(resolveKangurLessonDocumentPages(nextDocument)[0]?.id ?? null);
    },
    [onChange, setActivePageId]
  );

  const insertPageAfterActive = useCallback(
    (nextPage: KangurLessonPage): void => {
      if (activePageIndex >= 0) {
        applyPages(insertAfterIndex(pages, activePageIndex, nextPage));
      } else {
        applyPages([...pages, nextPage]);
      }
      setActivePageId(nextPage.id);
    },
    [activePageIndex, applyPages, pages, setActivePageId]
  );

  const addBlankPage = useCallback((): void => {
    const nextPage = createKangurLessonPage('', [], resolvePageSectionOptions(activePage));
    insertPageAfterActive(nextPage);
  }, [activePage, insertPageAfterActive]);

  const addPageFromTemplate = useCallback(
    (templateId: KangurLessonDocumentTemplateId): void => {
      const templatePage =
        resolveKangurLessonDocumentPages(createKangurLessonDocumentFromTemplate(templateId))[0] ??
        createKangurLessonPage('', []);
      const nextPage = {
        ...cloneKangurLessonPage(templatePage),
        ...resolvePageSectionOptions(activePage),
      };
      insertPageAfterActive(nextPage);
    },
    [activePage, insertPageAfterActive]
  );

  const duplicateActivePage = useCallback((): void => {
    if (activePageIndex < 0 || !activePage) return;
    const nextPage = cloneKangurLessonPage(activePage);
    applyPages(insertAfterIndex(pages, activePageIndex, nextPage));
    setActivePageId(nextPage.id);
  }, [activePage, activePageIndex, applyPages, pages, setActivePageId]);

  const moveActivePage = useCallback(
    (toIndex: number): void => {
      if (activePageIndex < 0 || !activePage) return;
      applyPages(moveItem(pages, activePageIndex, toIndex));
      setActivePageId(activePage.id);
    },
    [activePage, activePageIndex, applyPages, pages, setActivePageId]
  );

  const deleteActivePage = useCallback((): void => {
    if (!activePage || pages.length <= 1) return;
    const nextPages = pages.filter((page) => page.id !== activePage.id);
    applyPages(nextPages);
    setActivePageId(nextPages[Math.max(0, activePageIndex - 1)]?.id ?? nextPages[0]?.id ?? null);
  }, [activePage, activePageIndex, applyPages, pages, setActivePageId]);

  return {
    applyPages,
    updatePage,
    updateDocument,
    updateRootBlock,
    removeRootBlock,
    moveRootBlock,
    handleBlockReorder,
    duplicateRootBlock,
    updateGridBlock,
    replaceWithDocumentTemplate,
    insertPageAfterActive,
    addBlankPage,
    addPageFromTemplate,
    duplicateActivePage,
    moveActivePage,
    deleteActivePage,
  };
}
