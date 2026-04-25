'use client';

import { Plus, Users } from 'lucide-react';
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
import { FilemakerPersonMasterTreeNode } from '../components/shared/FilemakerPersonMasterTreeNode';
import { buildFilemakerPersonMasterNodes } from '../entity-master-tree';
import { FILEMAKER_DATABASE_KEY, parseFilemakerDatabase } from '../settings';
import type { FilemakerDatabase, FilemakerPerson } from '../types';
import { includeQuery } from './filemaker-page-utils';

type PersonPageState = {
  actions: PanelAction[];
  defaultExpandedNodeIds: string[];
  emptyLabel: string;
  isLoading: boolean;
  personCount: number;
  query: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
  setQuery: (value: string) => void;
  totalAddressCount: number;
  treeNodes: MasterTreeNode[];
};

const FILEMAKER_PERSON_TREE_INSTANCE: FolderTreeInstance = 'filemaker_persons';

const buildPersonSearchValues = (person: FilemakerPerson): string[] => [
  person.firstName,
  person.lastName,
  person.street,
  person.streetNumber,
  person.city,
  person.postalCode,
  person.country,
  person.countryId,
  person.nip,
  person.regon,
  person.phoneNumbers.join(' '),
];

function useFilteredPersons(database: FilemakerDatabase, query: string): FilemakerPerson[] {
  return useMemo(
    () =>
      [...database.persons]
        .filter((person: FilemakerPerson) => includeQuery(buildPersonSearchValues(person), query))
        .sort((left: FilemakerPerson, right: FilemakerPerson) =>
          `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
        ),
    [database.persons, query]
  );
}

function usePersonTreeNodes(persons: FilemakerPerson[]): {
  defaultExpandedNodeIds: string[];
  treeNodes: MasterTreeNode[];
} {
  const treeNodes = useMemo(() => buildFilemakerPersonMasterNodes(persons), [persons]);
  const defaultExpandedNodeIds = useMemo(
    () => treeNodes.filter((node: MasterTreeNode) => node.type === 'folder').map((node) => node.id),
    [treeNodes]
  );

  return { defaultExpandedNodeIds, treeNodes };
}

function usePersonActions(router: ReturnType<typeof useRouter>): {
  actions: PanelAction[];
  openPerson: (personId: string) => void;
} {
  const openPerson = useCallback(
    (personId: string): void => {
      startTransition(() => {
        router.push(`/admin/filemaker/persons/${encodeURIComponent(personId)}`);
      });
    },
    [router]
  );
  const actions = useMemo(
    () => [
      {
        key: 'create-person',
        label: 'Create Person',
        icon: <Plus className='size-4' />,
        onClick: () => {
          startTransition(() => {
            router.push('/admin/filemaker/persons/new');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'persons'),
    ],
    [router]
  );

  return { actions, openPerson };
}

function usePersonRenderNode(
  persons: FilemakerPerson[],
  onOpenPerson: (personId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const personById = useMemo(
    () => new Map<string, FilemakerPerson>(persons.map((person: FilemakerPerson) => [person.id, person])),
    [persons]
  );

  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerPersonMasterTreeNode {...input} personById={personById} onOpenPerson={onOpenPerson} />
    ),
    [onOpenPerson, personById]
  );
}

function usePersonPageState(): PersonPageState {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const persons = useFilteredPersons(database, deferredQuery);
  const { defaultExpandedNodeIds, treeNodes } = usePersonTreeNodes(persons);
  const { actions, openPerson } = usePersonActions(router);
  const renderNode = usePersonRenderNode(persons, openPerson);

  return {
    actions,
    defaultExpandedNodeIds,
    emptyLabel: query.trim().length > 0 ? 'No persons found' : 'No persons found in database',
    isLoading: settingsStore.isLoading,
    personCount: persons.length,
    query,
    renderNode,
    setQuery,
    totalAddressCount: database.addresses.length,
    treeNodes,
  };
}

function renderPersonBadges(state: PersonPageState): React.JSX.Element {
  return (
    <>
      <Badge variant='outline' className='text-[10px]'>
        Persons: {state.personCount}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        Total Addresses: {state.totalAddressCount}
      </Badge>
    </>
  );
}

export function AdminFilemakerPersonsPage(): React.JSX.Element {
  const state = usePersonPageState();

  return (
    <FilemakerEntityMasterTreePage
      instance={FILEMAKER_PERSON_TREE_INSTANCE}
      title='Filemaker Persons'
      description='Search and browse persons in a master folder tree.'
      icon={<Users className='size-4' />}
      actions={state.actions}
      badges={renderPersonBadges(state)}
      query={state.query}
      onQueryChange={state.setQuery}
      queryPlaceholder='Search name, address, NIP, REGON, phone...'
      nodes={state.treeNodes}
      defaultExpandedNodeIds={state.defaultExpandedNodeIds}
      isLoading={state.isLoading}
      emptyLabel={state.emptyLabel}
      renderNode={state.renderNode}
    />
  );
}
