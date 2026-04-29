'use client';

import { ChevronDown, ChevronRight, Edit2, Folder, FolderOpen, User } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerPersonNodeId } from '../../entity-master-tree';
import type { FilemakerPerson } from '../../types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type FilemakerPersonOrganizationLinkPreview = {
  legacyOrganizationUuid: string;
  organizationId?: string;
  organizationName?: string;
};

type FilemakerPersonWithLinks = FilemakerPerson & {
  legacyUuid?: string;
  linkedOrganizations?: FilemakerPersonOrganizationLinkPreview[];
  organizationLinkCount?: number;
  unresolvedOrganizationLinkCount?: number;
};

type FilemakerPersonTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  onOpenPerson: (personId: string) => void;
  personById: ReadonlyMap<string, FilemakerPersonWithLinks>;
};

type PersonGroupNodeProps = Pick<
  FolderTreeViewportRenderNodeInput,
  'node' | 'depth' | 'hasChildren' | 'isExpanded' | 'toggleExpand' | 'select'
> & {
  stateClassName: string;
};

type PersonLeafNodeProps = Pick<FolderTreeViewportRenderNodeInput, 'depth'> & {
  onOpenPerson: (personId: string) => void;
  person: FilemakerPersonWithLinks;
  stateClassName: string;
};

const resolvePersonTreeNodeStateClassName = (input: {
  isSelected: boolean;
  isSearchMatch: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const formatOptionalPersonField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const getPersonDisplayName = (person: FilemakerPerson): string => {
  const personLabel = `${person.firstName} ${person.lastName}`.trim();
  return personLabel.length > 0 ? personLabel : person.id;
};

const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

function PersonGroupToggleButton(props: {
  isExpanded: boolean;
  toggleExpand: () => void;
}): React.JSX.Element {
  const { isExpanded, toggleExpand } = props;
  const label = isExpanded ? 'Collapse person group' : 'Expand person group';

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

function FilemakerPersonGroupNode(props: PersonGroupNodeProps): React.JSX.Element {
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
        <PersonGroupToggleButton isExpanded={isExpanded} toggleExpand={toggleExpand} />
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

const formatOrganizationPreview = (person: FilemakerPersonWithLinks): string => {
  const links = person.linkedOrganizations ?? [];
  if (links.length === 0) return 'No linked organisations';
  const labels = links
    .slice(0, 3)
    .map((link: FilemakerPersonOrganizationLinkPreview): string => {
      const organizationName = link.organizationName?.trim() ?? '';
      return organizationName.length > 0 ? organizationName : link.legacyOrganizationUuid;
    });
  const remainingCount = Math.max(0, links.length - labels.length);
  return remainingCount > 0 ? `${labels.join(', ')} +${remainingCount}` : labels.join(', ');
};

function FilemakerPersonLeafDetails(props: {
  onOpenPerson: (personId: string) => void;
  person: FilemakerPersonWithLinks;
}): React.JSX.Element {
  const { onOpenPerson, person } = props;
  const organizationCount = person.organizationLinkCount ?? person.linkedOrganizations?.length ?? 0;

  return (
    <div className='min-w-0 flex-1 cursor-default'>
      <button
        type='button'
        className='inline-block max-w-full cursor-pointer select-text truncate align-top text-left font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenPerson(person.id);
        }}
      >
        {getPersonDisplayName(person)}
      </button>
      <div className='cursor-default text-xs text-gray-300'>
        <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
          {formatOrganizationPreview(person)}
        </span>
      </div>
      <div className='cursor-default text-[10px] text-gray-600'>
        <span className='inline-block max-w-full cursor-text select-text truncate align-top'>
          Organisations: {organizationCount} | Legacy UUID:{' '}
          {formatOptionalPersonField(person.legacyUuid)}
          <span className='md:hidden'> | Created: {formatTimestamp(person.createdAt)}</span>
          {' | '}Updated: {formatTimestamp(person.updatedAt)}
        </span>
      </div>
    </div>
  );
}

function PersonOrganizationCountColumn(props: {
  person: FilemakerPersonWithLinks;
}): React.JSX.Element {
  const organizationCount =
    props.person.organizationLinkCount ?? props.person.linkedOrganizations?.length ?? 0;

  return (
    <div
      className='hidden w-32 shrink-0 cursor-default justify-center md:flex'
      aria-label={`Organisations: ${organizationCount}`}
    >
      {organizationCount > 0 ? (
        <Badge variant='outline' className='h-5 max-w-full truncate text-[10px]'>
          Organisations {organizationCount}
        </Badge>
      ) : null}
    </div>
  );
}

function PersonUpdatedAtColumn(props: {
  person: FilemakerPersonWithLinks;
}): React.JSX.Element {
  const updatedAtLabel = formatTimestamp(props.person.updatedAt);

  return (
    <div
      className='hidden w-44 shrink-0 cursor-default justify-end text-right text-xs font-medium text-gray-200 md:flex'
      aria-label={`Updated at ${updatedAtLabel}`}
    >
      <span className='inline-block cursor-text select-text'>{updatedAtLabel}</span>
    </div>
  );
}

function PersonCreatedAtColumn(props: {
  person: FilemakerPersonWithLinks;
}): React.JSX.Element {
  const createdAtLabel = formatTimestamp(props.person.createdAt);

  return (
    <div
      className='hidden w-44 shrink-0 cursor-default text-right text-xs font-medium text-gray-200 md:block'
      aria-label={`Created at ${createdAtLabel}`}
    >
      <span className='inline-block cursor-text select-text'>{createdAtLabel}</span>
    </div>
  );
}

function FilemakerPersonLeafNode(props: PersonLeafNodeProps): React.JSX.Element {
  const { person, depth, stateClassName, onOpenPerson } = props;
  const displayPersonLabel = getPersonDisplayName(person);

  return (
    <div
      className={cn(
        'flex cursor-default items-center gap-2 rounded px-2 py-2 text-sm transition',
        stateClassName
      )}
      style={createTreeIndentStyle(depth)}
    >
      <TreeNodeSpacer />
      <User className='size-4 shrink-0 text-blue-300' />
      <FilemakerPersonLeafDetails person={person} onOpenPerson={onOpenPerson} />
      <PersonOrganizationCountColumn person={person} />
      <PersonUpdatedAtColumn person={person} />
      <PersonCreatedAtColumn person={person} />
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7 cursor-pointer'
        aria-label={`Edit person ${displayPersonLabel}`}
        title={`Edit person ${displayPersonLabel}`}
        onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          onOpenPerson(person.id);
        }}
      >
        <Edit2 className='size-3.5' />
      </Button>
    </div>
  );
}

export function FilemakerPersonMasterTreeNode(
  props: FilemakerPersonTreeNodeProps
): React.JSX.Element {
  const { node, isSelected, isSearchMatch, personById } = props;
  const personId = fromFilemakerPersonNodeId(node.id);
  const person = personId !== null ? (personById.get(personId) ?? null) : null;
  const stateClassName = resolvePersonTreeNodeStateClassName({ isSelected, isSearchMatch });

  if (person === null) {
    return <FilemakerPersonGroupNode {...props} stateClassName={stateClassName} />;
  }

  return (
    <FilemakerPersonLeafNode
      person={person}
      depth={props.depth}
      stateClassName={stateClassName}
      onOpenPerson={props.onOpenPerson}
    />
  );
}
