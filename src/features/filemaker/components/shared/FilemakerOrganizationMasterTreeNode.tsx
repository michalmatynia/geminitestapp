'use client';

import { Building2, ChevronDown, ChevronRight, Edit2, Folder, FolderOpen } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerOrganizationNodeId } from '../../entity-master-tree';
import { formatFilemakerAddress } from '../../settings';
import type { FilemakerOrganization } from '../../types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type FilemakerOrganizationTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  organizationById: Map<string, FilemakerOrganization>;
  onOpenOrganization: (organizationId: string) => void;
};

type OrganizationGroupNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'node' | 'depth' | 'hasChildren' | 'isExpanded' | 'toggleExpand' | 'select'
> & {
  stateClassName: string;
};

type OrganizationLeafNodeProps = Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'select'> & {
  organization: FilemakerOrganization;
  stateClassName: string;
  onOpenOrganization: (organizationId: string) => void;
};

const resolveOrganizationTreeNodeStateClassName = (input: {
  isSelected: boolean;
  isSearchMatch: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const formatOptionalOrganizationField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

function OrganizationGroupToggleButton(props: {
  isExpanded: boolean;
  toggleExpand: () => void;
}): React.JSX.Element {
  const { isExpanded, toggleExpand } = props;
  const label = isExpanded ? 'Collapse organization group' : 'Expand organization group';

  return (
    <Button
      variant='ghost'
      size='sm'
      className='size-5 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300'
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        toggleExpand();
      }}
      aria-label={label}
      title={label}
    >
      {isExpanded ? <ChevronDown className='size-3.5' /> : <ChevronRight className='size-3.5' />}
    </Button>
  );
}

function FilemakerOrganizationGroupNode(props: OrganizationGroupNodeProps): React.JSX.Element {
  const { node, depth, hasChildren, isExpanded, toggleExpand, select, stateClassName } = props;
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        if (hasChildren) toggleExpand();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        if (hasChildren) toggleExpand();
      }}
    >
      {hasChildren ? (
        <OrganizationGroupToggleButton isExpanded={isExpanded} toggleExpand={toggleExpand} />
      ) : (
        <TreeNodeSpacer />
      )}
      <FolderIcon className='size-4 shrink-0 text-sky-300/80' />
      <div className='min-w-0 flex-1 truncate font-medium text-gray-100'>{node.name}</div>
      <Badge variant='outline' className='h-5 shrink-0 text-[10px]'>
        {Number(node.metadata?.['count'] ?? 0)}
      </Badge>
    </div>
  );
}

function FilemakerOrganizationLeafDetails(props: {
  organization: FilemakerOrganization;
}): React.JSX.Element {
  const { organization } = props;
  const tradingName = organization.tradingName?.trim() ?? '';

  return (
    <div className='min-w-0 flex-1'>
      <div className='truncate font-semibold text-white'>{organization.name}</div>
      {tradingName.length > 0 ? (
        <div className='truncate text-[11px] italic text-gray-400'>{tradingName}</div>
      ) : null}
      <div className='truncate text-xs text-gray-300'>{formatFilemakerAddress(organization)}</div>
      <div className='truncate text-[10px] text-gray-600'>
        NIP: {formatOptionalOrganizationField(organization.taxId)} | KRS:{' '}
        {formatOptionalOrganizationField(organization.krs)} | Updated:{' '}
        {formatTimestamp(organization.updatedAt)}
      </div>
    </div>
  );
}

function FilemakerOrganizationLeafNode(props: OrganizationLeafNodeProps): React.JSX.Element {
  const { organization, depth, select, stateClassName, onOpenOrganization } = props;

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        onOpenOrganization(organization.id);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        onOpenOrganization(organization.id);
      }}
    >
      <TreeNodeSpacer />
      <Building2 className='size-4 shrink-0 text-blue-300' />
      <FilemakerOrganizationLeafDetails organization={organization} />
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7 cursor-pointer'
        aria-label={`Edit organization ${organization.name}`}
        title={`Edit organization ${organization.name}`}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenOrganization(organization.id);
        }}
      >
        <Edit2 className='size-3.5' />
      </Button>
    </div>
  );
}

export function FilemakerOrganizationMasterTreeNode(
  props: FilemakerOrganizationTreeNodeProps
): React.JSX.Element {
  const { node, isSelected, isSearchMatch, organizationById } = props;
  const organizationId = fromFilemakerOrganizationNodeId(node.id);
  const organization =
    organizationId !== null ? (organizationById.get(organizationId) ?? null) : null;
  const stateClassName = resolveOrganizationTreeNodeStateClassName({ isSelected, isSearchMatch });

  if (organization === null) {
    return <FilemakerOrganizationGroupNode {...props} stateClassName={stateClassName} />;
  }

  return (
    <FilemakerOrganizationLeafNode
      organization={organization}
      depth={props.depth}
      select={props.select}
      stateClassName={stateClassName}
      onOpenOrganization={props.onOpenOrganization}
    />
  );
}
