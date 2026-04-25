'use client';

import React from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { MasterTreeSettingsButton } from '@/shared/ui/navigation-and-layout.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';

import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { FolderTreeInstance } from '@/shared/utils/folder-tree-profiles-v2';

export interface FilemakerEntityMasterTreePageProps {
  instance: FolderTreeInstance;
  title: string;
  description: string;
  icon: React.ReactNode;
  actions: PanelAction[];
  badges: React.ReactNode;
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder: string;
  nodes: MasterTreeNode[];
  defaultExpandedNodeIds: string[];
  isLoading: boolean;
  emptyLabel: string;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.ReactNode;
}

type FilemakerEntityMasterTreePanelProps = Pick<
  FilemakerEntityMasterTreePageProps,
  | 'instance'
  | 'badges'
  | 'query'
  | 'onQueryChange'
  | 'queryPlaceholder'
  | 'nodes'
  | 'defaultExpandedNodeIds'
  | 'isLoading'
  | 'emptyLabel'
  | 'renderNode'
>;

function renderFilemakerEntityTreeFilters({
  badges,
  query,
  onQueryChange,
  queryPlaceholder,
}: Pick<
  FilemakerEntityMasterTreePageProps,
  'badges' | 'query' | 'onQueryChange' | 'queryPlaceholder'
>): React.JSX.Element {
  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-wrap items-center gap-2'>{badges}</div>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            onQueryChange(event.target.value);
          }}
          onClear={() => onQueryChange('')}
          placeholder={queryPlaceholder}
          aria-label={queryPlaceholder}
          size='sm'
        />
      </div>
    </div>
  );
}

export function FilemakerEntityMasterTreePage(
  props: FilemakerEntityMasterTreePageProps
): React.JSX.Element {
  const { title, description, icon, actions } = props;

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader title={title} description={description} icon={icon} actions={actions} />
      <FilemakerEntityMasterTreePanel {...props} />
    </div>
  );
}

function FilemakerEntityMasterTreePanel(
  props: FilemakerEntityMasterTreePanelProps
): React.JSX.Element {
  const { instance, query, nodes, defaultExpandedNodeIds, renderNode } = props;
  const isSearching = query.trim().length > 0;

  const {
    controller,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance,
    nodes,
    initiallyExpandedNodeIds: defaultExpandedNodeIds,
    ...(isSearching ? { expandedNodeIds: defaultExpandedNodeIds } : {}),
  });

  return (
    <StandardDataTablePanel
      filters={renderFilemakerEntityTreeFilters(props)}
      columns={[]}
      data={[]}
      isLoading={props.isLoading}
      showTable={false}
      contentClassName='space-y-3'
    >
      <div className='relative'>
        <FolderTreeViewportV2
          controller={controller}
          scrollToNodeRef={scrollToNodeRef}
          rootDropUi={rootDropUi}
          enableDnd={false}
          emptyLabel={props.emptyLabel}
          estimateRowHeight={64}
          renderNode={renderNode}
        />
        <MasterTreeSettingsButton instance={instance} />
      </div>
    </StandardDataTablePanel>
  );
}
