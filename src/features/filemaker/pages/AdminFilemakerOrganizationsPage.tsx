'use client';

import { Building2, Plus } from 'lucide-react';
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
import { FilemakerOrganizationMasterTreeNode } from '../components/shared/FilemakerOrganizationMasterTreeNode';
import { buildFilemakerOrganizationMasterNodes } from '../entity-master-tree';
import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import type { FilemakerDatabase, FilemakerOrganization } from '../types';
import { includeQuery } from './filemaker-page-utils';

type OrganizationPageState = {
  actions: PanelAction[];
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

  return {
    actions,
    defaultExpandedNodeIds,
    emptyLabel:
      query.trim().length > 0 ? 'No organizations found' : 'No organizations found in database',
    isLoading: settingsStore.isLoading,
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
