import { useMemo, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import {
  buildKangurLessonCatalogMasterNodes,
  buildKangurLessonMasterNodes,
  resolveKangurLessonOrderFromNodes,
} from '../../kangur-lessons-master-tree';
import {
  createMasterFolderTreeOrderedItemsAdapter,
  type MasterFolderTreeAdapterV3,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import type { LessonTreeMode } from '../../types';
import { CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE } from '../../constants';
import { canonicalizeKangurLessons } from '../../../settings';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

type UseLessonsManagerTreeInput = {
  filteredLessons: KangurLesson[];
  lessons: KangurLesson[];
  lessonById: Map<string, KangurLesson>;
  treeMode: LessonTreeMode;
  onPersistLessons: (lessons: KangurLesson[]) => Promise<unknown>;
};

type UseLessonsManagerTreeReturn = ReturnType<typeof useMasterFolderTreeViewModel> & {
  tree: ReturnType<typeof useMasterFolderTreeViewModel>;
  orderedTreeSearchQuery: string;
  setOrderedTreeSearchQuery: Dispatch<SetStateAction<string>>;
  catalogTreeSearchQuery: string;
  setCatalogTreeSearchQuery: Dispatch<SetStateAction<string>>;
  treeSearchQuery: string;
  handleTreeSearchChange: (nextQuery: string) => void;
  masterNodes: MasterTreeNode[];
};

const useLessonsManagerTreeAdapter = ({
  filteredLessons,
  lessons,
  lessonById,
  isCatalogMode,
  onPersistLessons,
}: UseLessonsManagerTreeInput & { isCatalogMode: boolean }): MasterFolderTreeAdapterV3 =>
  useMemo(
    () =>
      createMasterFolderTreeOrderedItemsAdapter({
        items: lessons,
        itemById: lessonById,
        getItemId: (lesson) => lesson.id,
        resolveOrderedItemsFromNodes: resolveKangurLessonOrderFromNodes,
        normalizeItems: canonicalizeKangurLessons,
        onPersistItems: onPersistLessons,
        shouldPersist: () => !isCatalogMode && filteredLessons.length === lessons.length,
      }),
    [filteredLessons.length, isCatalogMode, lessonById, lessons, onPersistLessons]
  );

export function useLessonsManagerTree({
  filteredLessons,
  lessons,
  lessonById,
  treeMode,
  onPersistLessons,
}: UseLessonsManagerTreeInput): UseLessonsManagerTreeReturn {
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

  const adapter = useLessonsManagerTreeAdapter({
    filteredLessons,
    lessons,
    lessonById,
    treeMode,
    isCatalogMode,
    onPersistLessons,
  });

  const tree = useMasterFolderTreeViewModel({
    instance: activeTreeInstance,
    nodes: masterNodes,
    adapter,
    searchQuery: treeSearchQuery,
  });

  return {
    tree,
    orderedTreeSearchQuery, setOrderedTreeSearchQuery,
    catalogTreeSearchQuery, setCatalogTreeSearchQuery,
    treeSearchQuery,
    handleTreeSearchChange,
    masterNodes,
    ...tree,
  };
}
