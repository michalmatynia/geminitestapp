import { useMemo, useState, useCallback } from 'react';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { buildKangurLessonCatalogMasterNodes, buildKangurLessonMasterNodes } from '../../kangur-lessons-master-tree';
import { useMasterFolderTreeShell, useMasterFolderTreeSearch } from '@/shared/lib/foldertree/public';
import type { LessonTreeMode } from '../../types';
import { CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE } from '../../constants';

export function useLessonsManagerTree(filteredLessons: KangurLesson[], treeMode: LessonTreeMode) {
  const [orderedTreeSearchQuery, setOrderedTreeSearchQuery] = useState('');
  const [catalogTreeSearchQuery, setCatalogTreeSearchQuery] = useState('');

  const isCatalogMode = treeMode === 'catalog';
  const activeTreeInstance = isCatalogMode ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;
  const treeSearchQuery = isCatalogMode ? catalogTreeSearchQuery : orderedTreeSearchQuery;

  const handleTreeSearchChange = useCallback(
    (nextQuery: string): void => {
      if (isCatalogMode) {
        setCatalogTreeSearchQuery(nextQuery);
        return;
      }
      setOrderedTreeSearchQuery(nextQuery);
    },
    [isCatalogMode]
  );

  const masterNodes = useMemo(
    () => isCatalogMode ? buildKangurLessonCatalogMasterNodes(filteredLessons) : buildKangurLessonMasterNodes(filteredLessons),
    [filteredLessons, isCatalogMode]
  );

  const shell = useMasterFolderTreeShell({
    instance: activeTreeInstance,
    nodes: masterNodes,
  });

  const searchState = useMasterFolderTreeSearch(masterNodes, treeSearchQuery, { config: shell.capabilities.search });

  return {
    orderedTreeSearchQuery, setOrderedTreeSearchQuery,
    catalogTreeSearchQuery, setCatalogTreeSearchQuery,
    treeSearchQuery,
    handleTreeSearchChange,
    masterNodes,
    ...shell,
    searchState
  };
}
