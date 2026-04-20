'use client';

import type { JSX } from 'react';
import { AdminKangurLessonsManagerTreePanel } from '../AdminKangurLessonsManagerTreePanel';
import { LessonTreeRow } from '../LessonTreeRow';
import { CATALOG_TREE_INSTANCE, ORDERED_TREE_INSTANCE } from '../../constants';
import { 
  useMasterFolderTreeSearch, 
  useMasterFolderTreeShell 
} from '@/shared/lib/foldertree/public';

interface LessonTreeProps {
  lessons: any[];
  mode: any;
  onSelect: (id: string) => void;
}

export function LessonTree({ lessons, mode, onSelect }: LessonTreeProps): JSX.Element {
  const treeInstance = mode === 'catalog' ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;
  const treeShell = useMasterFolderTreeShell(treeInstance);
  const { searchProps } = useMasterFolderTreeSearch(treeInstance);

  return (
    <AdminKangurLessonsManagerTreePanel
      treeShell={treeShell}
      searchProps={searchProps}
      renderNode={(node) => (
        <LessonTreeRow
          node={node}
          onSelect={onSelect}
          // ... additional props
        />
      )}
    />
  );
}
