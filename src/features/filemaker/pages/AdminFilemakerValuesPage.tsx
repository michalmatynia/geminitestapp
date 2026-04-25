'use client';

import { Plus, Tags, Upload } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { FileUploadButton, type FileUploadHelpers } from '@/shared/ui/forms-and-actions.public';
import { Badge, useToast } from '@/shared/ui/primitives.public';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityMasterTreePage } from '../components/shared/FilemakerEntityMasterTreePage';
import { FilemakerValueMasterTreeNode } from '../components/shared/FilemakerValueMasterTreeNode';
import { buildFilemakerValueMasterNodes } from '../entity-master-tree';
import {
  FILEMAKER_DATABASE_KEY,
  importFilemakerLegacyValuesExport,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase, FilemakerValue } from '../types';
import { filterFilemakerValuesWithHierarchy } from './AdminFilemakerValuesPage.helpers';

const FILEMAKER_VALUE_TREE_INSTANCE: FolderTreeInstance = 'filemaker_values';
const VALUE_IMPORT_ACCEPT = '.csv,text/csv,text/tab-separated-values,.tsv';

function useFilteredFilemakerValues(values: FilemakerValue[], query: string): FilemakerValue[] {
  return useMemo(
    () => filterFilemakerValuesWithHierarchy(values, query),
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

function useImportValueCsvAction(input: {
  database: FilemakerDatabase;
  refetchSettings: () => void;
}): {
  importActions: React.ReactNode;
  isImporting: boolean;
} {
  const { database, refetchSettings } = input;
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const handleFilesSelected = useCallback(
    async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
      const file = files[0];
      if (!file) return;

      helpers?.setProgress(10);
      const text = await file.text();
      helpers?.setProgress(40);
      const result = importFilemakerLegacyValuesExport(database, text);
      helpers?.setProgress(70);

      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(result.database)),
      });
      refetchSettings();
      helpers?.setProgress(100);
      toast(
        `Imported ${result.importedValueCount} values, ${result.importedParameterCount} lists, and ${result.importedLinkCount} links from ${file.name}.`,
        { variant: 'success' }
      );
    },
    [database, refetchSettings, toast, updateSetting]
  );

  const handleImportError = useCallback(
    (error: unknown): void => {
      toast(error instanceof Error ? error.message : 'Failed to import value CSV.', {
        variant: 'error',
      });
    },
    [toast]
  );

  return {
    importActions: (
      <FileUploadButton
        variant='outline'
        size='sm'
        className='h-8'
        accept={VALUE_IMPORT_ACCEPT}
        multiple={false}
        showProgress={false}
        disabled={updateSetting.isPending}
        onFilesSelected={handleFilesSelected}
        onError={handleImportError}
      >
        <Upload className='mr-1 size-4' />
        Import CSV
      </FileUploadButton>
    ),
    isImporting: updateSetting.isPending,
  };
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
  const { importActions, isImporting } = useImportValueCsvAction({
    database,
    refetchSettings: settingsStore.refetch,
  });
  const renderNode = useValueRenderNode(values, openValue);

  return (
    <FilemakerEntityMasterTreePage
      instance={FILEMAKER_VALUE_TREE_INSTANCE}
      title='Filemaker Values'
      description='Search and browse hierarchical Filemaker values in a master folder tree.'
      icon={<Tags className='size-4' />}
      actions={actions}
      customActions={importActions}
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
      isLoading={settingsStore.isLoading || isImporting}
      emptyLabel={query.trim().length > 0 ? 'No values found' : 'No values found in database'}
      renderNode={renderNode}
    />
  );
}
