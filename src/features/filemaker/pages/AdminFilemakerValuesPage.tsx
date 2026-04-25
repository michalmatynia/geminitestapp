'use client';

import { Plus, Tags } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge } from '@/shared/ui/primitives.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityMasterTreePage } from '../components/shared/FilemakerEntityMasterTreePage';
import { FilemakerValueMasterTreeNode } from '../components/shared/FilemakerValueMasterTreeNode';
import { buildFilemakerValueMasterNodes } from '../entity-master-tree';
import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import type { FilemakerValue } from '../types';
import { includeQuery } from './filemaker-page-utils';

const FILEMAKER_VALUE_TREE_INSTANCE: FolderTreeInstance = 'filemaker_values';

const buildValueSearchValues = (value: FilemakerValue): string[] => [
  value.label,
  value.value,
  value.description ?? '',
];

function useFilteredFilemakerValues(values: FilemakerValue[], query: string): FilemakerValue[] {
  return useMemo(
    () =>
      values
        .filter((value: FilemakerValue) => includeQuery(buildValueSearchValues(value), query))
        .sort((left: FilemakerValue, right: FilemakerValue) => {
          if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
          return left.label.localeCompare(right.label);
        }),
    [query, values]
  );
}

function useFilemakerValueNodes(values: FilemakerValue[]): {
  defaultExpandedNodeIds: string[];
  treeNodes: MasterTreeNode[];
} {
  const treeNodes = useMemo(() => buildFilemakerValueMasterNodes(values), [values]);
  const defaultExpandedNodeIds = useMemo(
    () => treeNodes.filter((node: MasterTreeNode) => node.type === 'folder').map((node) => node.id),
    [treeNodes]
  );

  return { defaultExpandedNodeIds, treeNodes };
}

function useValueRenderNode(
  values: FilemakerValue[],
  onOpenValue: (valueId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const valueById = useMemo(
    () => new Map<string, FilemakerValue>(values.map((value: FilemakerValue) => [value.id, value])),
    [values]
  );

  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerValueMasterTreeNode {...input} valueById={valueById} onOpenValue={onOpenValue} />
    ),
    [onOpenValue, valueById]
  );
}

function useValueActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openValue: (valueId: string) => void;
} {
  const openValue = useCallback(
    (valueId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/values/${encodeURIComponent(valueId)}`);
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-value',
        label: 'Create Value',
        icon: <Plus className='size-4' />,
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/values/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'values'),
    ],
    [router]
  );

  return { actions, openValue };
}

export function AdminFilemakerValuesPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const values = useFilteredFilemakerValues(database.values, deferredQuery);
  const { defaultExpandedNodeIds, treeNodes } = useFilemakerValueNodes(values);
  const { actions, openValue } = useValueActions(router);
  const renderNode = useValueRenderNode(values, openValue);

  return (
    <FilemakerEntityMasterTreePage
      instance={FILEMAKER_VALUE_TREE_INSTANCE}
      title='Filemaker Values'
      description='Search and browse hierarchical Filemaker values in a master folder tree.'
      icon={<Tags className='size-4' />}
      actions={actions}
      badges={
        <Badge variant='outline' className='text-[10px]'>
          Values: {values.length}
        </Badge>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search values...'
      nodes={treeNodes}
      defaultExpandedNodeIds={defaultExpandedNodeIds}
      isLoading={settingsStore.isLoading}
      emptyLabel={query.trim().length > 0 ? 'No values found' : 'No values found in database'}
      renderNode={renderNode}
    />
  );
}
