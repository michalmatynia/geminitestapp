'use client';

import { Building2, Plus, Upload } from 'lucide-react';
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
import { FilemakerOrganizationMasterTreeNode } from '../components/shared/FilemakerOrganizationMasterTreeNode';
import { buildFilemakerOrganizationMasterNodes } from '../entity-master-tree';
import {
  FILEMAKER_DATABASE_KEY,
  importFilemakerLegacyOrganisersExport,
  importFilemakerLegacyOrganisersWorkbook,
  parseFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from '../settings';
import type { FilemakerDatabase, FilemakerOrganization } from '../types';
import { includeQuery } from './filemaker-page-utils';

type OrganizationPageState = {
  actions: PanelAction[];
  customActions: React.ReactNode;
  defaultExpandedNodeIds: string[];
  emptyLabel: string;
  isLoading: boolean;
  organizationCount: number;
  query: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  setQuery: (value: string) => void;
  totalAddressCount: number;
  treeNodes: MasterTreeNode[];
};

const FILEMAKER_ORGANIZATION_TREE_INSTANCE: FolderTreeInstance = 'filemaker_organizations';
const ORGANISER_IMPORT_ACCEPT = [
  '.csv',
  '.tsv',
  '.xlsx',
  '.xls',
  'text/csv',
  'text/tab-separated-values',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
].join(',');

const isWorkbookImportFile = (file: File): boolean => {
  if (/\.(csv|tsv)$/i.test(file.name)) return false;
  if (/\.(xlsx|xls)$/i.test(file.name)) return true;
  return (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  );
};

type ImportOrganiserFileButtonProps = {
  disabled: boolean;
  onError: (error: unknown) => void;
  onFilesSelected: (files: File[], helpers?: FileUploadHelpers) => Promise<void>;
};

const buildOrganizationSearchValues = (organization: FilemakerOrganization): string[] => [
  organization.name,
  organization.street,
  organization.streetNumber,
  organization.city,
  organization.postalCode,
  organization.country,
  organization.countryId,
];

function useFilteredOrganizations(
  database: FilemakerDatabase,
  query: string
): FilemakerOrganization[] {
  return useMemo(
    () =>
      [...database.organizations]
        .filter((organization: FilemakerOrganization) =>
          includeQuery(buildOrganizationSearchValues(organization), query)
        )
        .sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
          left.name.localeCompare(right.name)
        ),
    [database.organizations, query]
  );
}

function useOrganizationTreeNodes(organizations: FilemakerOrganization[]): {
  defaultExpandedNodeIds: string[];
  treeNodes: MasterTreeNode[];
} {
  const treeNodes = useMemo(
    () => buildFilemakerOrganizationMasterNodes(organizations),
    [organizations]
  );
  const defaultExpandedNodeIds = useMemo(
    () => treeNodes.filter((node: MasterTreeNode) => node.type === 'folder').map((node) => node.id),
    [treeNodes]
  );

  return { defaultExpandedNodeIds, treeNodes };
}

function useOrganizationActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openOrganization: (organizationId: string) => void;
} {
  const openOrganization = useCallback(
    (organizationId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/organizations/${encodeURIComponent(organizationId)}`);
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-organization',
        label: 'Create Organization',
        icon: <Plus className='size-4' />,
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/organizations/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'organizations'),
    ],
    [router]
  );

  return { actions, openOrganization };
}

function useOrganizationRenderNode(
  organizations: FilemakerOrganization[],
  onOpenOrganization: (organizationId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const organizationById = useMemo(
    () =>
      new Map<string, FilemakerOrganization>(
        organizations.map((organization: FilemakerOrganization) => [organization.id, organization])
      ),
    [organizations]
  );

  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerOrganizationMasterTreeNode
        {...input}
        organizationById={organizationById}
        onOpenOrganization={onOpenOrganization}
      />
    ),
    [onOpenOrganization, organizationById]
  );
}

function ImportOrganiserFileButton(
  props: ImportOrganiserFileButtonProps
): React.JSX.Element {
  return (
    <FileUploadButton
      variant='outline'
      size='sm'
      className='h-8'
      accept={ORGANISER_IMPORT_ACCEPT}
      multiple={false}
      showProgress={false}
      disabled={props.disabled}
      onFilesSelected={props.onFilesSelected}
      onError={props.onError}
    >
      <Upload className='mr-1 size-4' />
      Import Organisers
    </FileUploadButton>
  );
}

function useImportOrganiserFileAction(input: {
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
      const result = isWorkbookImportFile(file)
        ? await importFilemakerLegacyOrganisersWorkbook(database, await file.arrayBuffer())
        : importFilemakerLegacyOrganisersExport(database, await file.text());
      helpers?.setProgress(70);

      await updateSetting.mutateAsync({
        key: FILEMAKER_DATABASE_KEY,
        value: JSON.stringify(toPersistedFilemakerDatabase(result.database)),
      });
      refetchSettings();
      helpers?.setProgress(100);
      toast(
        `Imported ${result.importedOrganizationCount} organisers from ${file.name}. Ignored ${result.ignoredColumnNames.length} related or placeholder columns.`,
        { variant: 'success' }
      );
    },
    [database, refetchSettings, toast, updateSetting]
  );

  const handleImportError = useCallback(
    (error: unknown): void => {
      toast(error instanceof Error ? error.message : 'Failed to import organiser export.', {
        variant: 'error',
      });
    },
    [toast]
  );

  return {
    importActions: (
      <ImportOrganiserFileButton
        disabled={updateSetting.isPending}
        onError={handleImportError}
        onFilesSelected={handleFilesSelected}
      />
    ),
    isImporting: updateSetting.isPending,
  };
}

function useOrganizationPageState(): OrganizationPageState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const organizations = useFilteredOrganizations(database, deferredQuery);
  const { defaultExpandedNodeIds, treeNodes } = useOrganizationTreeNodes(organizations);
  const { actions, openOrganization } = useOrganizationActions(router);
  const renderNode = useOrganizationRenderNode(organizations, openOrganization);
  const { importActions, isImporting } = useImportOrganiserFileAction({
    database,
    refetchSettings: settingsStore.refetch,
  });

  return {
    actions,
    customActions: importActions,
    defaultExpandedNodeIds,
    emptyLabel:
      query.trim().length > 0 ? 'No organizations found' : 'No organizations found in database',
    isLoading: settingsStore.isLoading || isImporting,
    organizationCount: organizations.length,
    query,
    renderNode,
    setQuery,
    totalAddressCount: database.addresses.length,
    treeNodes,
  };
}

function renderOrganizationBadges(state: OrganizationPageState): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Organizations: {state.organizationCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Total Addresses: {state.totalAddressCount}
      </Badge>
    </>
  );
}

export function AdminFilemakerOrganizationsPage(): React.JSX.Element {
  const state = useOrganizationPageState();

  return (
    <FilemakerEntityMasterTreePage
      instance={FILEMAKER_ORGANIZATION_TREE_INSTANCE}
      title='Filemaker Organizations'
      description='Search and browse organizations in a master folder tree.'
      icon={<Building2 className='size-4' />}
      actions={state.actions}
      customActions={state.customActions}
      badges={renderOrganizationBadges(state)}
      query={state.query}
      onQueryChange={state.setQuery}
      queryPlaceholder='Search organization name and address...'
      nodes={state.treeNodes}
      defaultExpandedNodeIds={state.defaultExpandedNodeIds}
      isLoading={state.isLoading}
      emptyLabel={state.emptyLabel}
      renderNode={state.renderNode}
    />
  );
}
