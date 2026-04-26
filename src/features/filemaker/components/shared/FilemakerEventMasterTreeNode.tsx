'use client';

import { CalendarDays, Edit2 } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerEventNodeId } from '../../entity-master-tree';
import { formatFilemakerAddress } from '../../settings';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { MongoFilemakerEvent } from '../../pages/AdminFilemakerEventsPage.types';

type FilemakerEventTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  eventById: ReadonlyMap<string, MongoFilemakerEvent>;
  onOpenEvent: (eventId: string) => void;
};

type EventLeafNodeProps = Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'select'> & {
  event: MongoFilemakerEvent;
  onOpenEvent: (eventId: string) => void;
  stateClassName: string;
};

const resolveEventTreeNodeStateClassName = (input: {
  isSearchMatch: boolean;
  isSelected: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const formatOptionalEventField = (value: string | null | undefined): string => {
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

const formatOrganizationPreview = (event: MongoFilemakerEvent): string => {
  if (event.linkedOrganizations.length === 0) return 'No linked organisations';
  const labels = event.linkedOrganizations
    .slice(0, 3)
    .map((link): string => {
      const organizationName = link.organizationName?.trim() ?? '';
      return organizationName.length > 0 ? organizationName : link.legacyOrganizationUuid;
    });
  const remainingCount = Math.max(0, event.linkedOrganizations.length - labels.length);
  return remainingCount > 0 ? `${labels.join(', ')} +${remainingCount}` : labels.join(', ');
};

function FilemakerEventLeafDetails(props: { event: MongoFilemakerEvent }): React.JSX.Element {
  const { event } = props;
  return (
    <div className='min-w-0 flex-1'>
      <div className='truncate font-semibold text-white'>{event.eventName}</div>
      <div className='truncate text-xs text-gray-300'>{formatOrganizationPreview(event)}</div>
      <div className='truncate text-[11px] text-gray-400'>
        {formatOptionalEventField(event.eventStartDate)} | {formatFilemakerAddress(event)}
      </div>
      <div className='truncate text-[10px] text-gray-600'>
        Organisations: {event.organizationLinkCount} | Legacy UUID:{' '}
        {formatOptionalEventField(event.legacyUuid)} | Updated: {formatTimestamp(event.updatedAt)}
      </div>
    </div>
  );
}

function FilemakerEventLeafNode(props: EventLeafNodeProps): React.JSX.Element {
  const { event, depth, select, stateClassName, onOpenEvent } = props;
  return (
    <div
      className={cn('flex items-center gap-2 rounded px-2 py-2 text-sm transition', stateClassName)}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(clickEvent: React.MouseEvent<HTMLDivElement>): void => {
        select(clickEvent);
        onOpenEvent(event.id);
      }}
      onKeyDown={(keyEvent: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(keyEvent)) return;
        keyEvent.preventDefault();
        onOpenEvent(event.id);
      }}
    >
      <TreeNodeSpacer />
      <CalendarDays className='size-4 shrink-0 text-blue-300' />
      <FilemakerEventLeafDetails event={event} />
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='size-7'
        aria-label={`Edit event ${event.eventName}`}
        title={`Edit event ${event.eventName}`}
        onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>): void => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          onOpenEvent(event.id);
        }}
      >
        <Edit2 className='size-3.5' />
      </Button>
    </div>
  );
}

export function FilemakerEventMasterTreeNode(
  props: FilemakerEventTreeNodeProps
): React.JSX.Element | null {
  const { node, isSelected, isSearchMatch, eventById } = props;
  const eventId = fromFilemakerEventNodeId(node.id);
  const event = eventId !== null ? (eventById.get(eventId) ?? null) : null;
  if (event === null) return null;
  const stateClassName = resolveEventTreeNodeStateClassName({ isSelected, isSearchMatch });

  return (
    <FilemakerEventLeafNode
      event={event}
      depth={props.depth}
      select={props.select}
      stateClassName={stateClassName}
      onOpenEvent={props.onOpenEvent}
    />
  );
}
