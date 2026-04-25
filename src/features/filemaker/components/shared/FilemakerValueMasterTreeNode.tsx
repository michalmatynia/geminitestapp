'use client';

import { ChevronDown, ChevronRight, Edit2, Folder, FolderOpen, Tag } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerValueNodeId } from '../../entity-master-tree';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import type { FilemakerValue } from '../../types';

type FilemakerValueMasterTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  onOpenValue: (valueId: string) => void;
  valueById: Map<string, FilemakerValue>;
};

const resolveValueTreeNodeStateClassName = (input: {
  isSelected: boolean;
  isSearchMatch: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

function ValueToggleButton(props: {
  isExpanded: boolean;
  toggleExpand: () => void;
}): React.JSX.Element {
  const { isExpanded, toggleExpand } = props;
  const label = isExpanded ? 'Collapse value' : 'Expand value';

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

function ValueNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

function FilemakerValueDetails(props: { value: FilemakerValue }): React.JSX.Element {
  const { value } = props;

  return (
    <div className='min-w-0 flex-1'>
      <div className='truncate font-semibold text-white'>{value.label}</div>
      {value.value.trim().length > 0 ? (
        <div className='truncate text-xs text-gray-300'>{value.value}</div>
      ) : null}
      <div className='truncate text-[10px] text-gray-600'>
        Updated: {formatTimestamp(value.updatedAt)}
      </div>
    </div>
  );
}

function FilemakerValueIcon(props: {
  hasChildren: boolean;
  isExpanded: boolean;
}): React.JSX.Element {
  if (!props.hasChildren) {
    return <Tag className='size-4 shrink-0 text-blue-300' />;
  }
  const FolderIcon = props.isExpanded ? FolderOpen : Folder;
  return <FolderIcon className='size-4 shrink-0 text-sky-300/80' />;
}

function FilemakerValueContent(props: {
  nodeName: string;
  value: FilemakerValue | null;
}): React.JSX.Element {
  if (props.value === null) {
    return <div className='min-w-0 flex-1 truncate font-medium text-gray-100'>{props.nodeName}</div>;
  }
  return <FilemakerValueDetails value={props.value} />;
}

function FilemakerValueDescriptionBadge(props: {
  value: FilemakerValue | null;
}): React.JSX.Element | null {
  const description = props.value?.description?.trim() ?? '';
  if (description.length === 0) return null;

  return (
    <Badge variant='outline' className='h-5 max-w-[180px] truncate text-[10px]'>
      {description}
    </Badge>
  );
}

function FilemakerValueEditButton(props: {
  onOpenValue: (valueId: string) => void;
  value: FilemakerValue | null;
}): React.JSX.Element | null {
  if (props.value === null) return null;

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className='size-7'
      aria-label={`Edit value ${props.value.label}`}
      title={`Edit value ${props.value.label}`}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        props.onOpenValue(props.value.id);
      }}
    >
      <Edit2 className='size-3.5' />
    </Button>
  );
}

export function FilemakerValueMasterTreeNode(
  props: FilemakerValueMasterTreeNodeProps
): React.JSX.Element {
  const { node, depth, hasChildren, isExpanded, isSelected, isSearchMatch, select, toggleExpand } =
    props;
  const valueId = fromFilemakerValueNodeId(node.id);
  const value = valueId !== null ? (props.valueById.get(valueId) ?? null) : null;
  const stateClassName = resolveValueTreeNodeStateClassName({ isSelected, isSearchMatch });

  return (
    <div
      className={cn('flex items-center gap-2 rounded px-2 py-2 text-sm transition', stateClassName)}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(event: React.MouseEvent<HTMLDivElement>): void => {
        select(event);
        if (hasChildren) {
          toggleExpand();
          return;
        }
        if (value !== null) props.onOpenValue(value.id);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(event)) return;
        event.preventDefault();
        if (hasChildren) {
          toggleExpand();
          return;
        }
        if (value !== null) props.onOpenValue(value.id);
      }}
    >
      {hasChildren ? (
        <ValueToggleButton isExpanded={isExpanded} toggleExpand={toggleExpand} />
      ) : (
        <ValueNodeSpacer />
      )}
      <FilemakerValueIcon hasChildren={hasChildren} isExpanded={isExpanded} />
      <FilemakerValueContent nodeName={node.name} value={value} />
      <FilemakerValueDescriptionBadge value={value} />
      <FilemakerValueEditButton value={value} onOpenValue={props.onOpenValue} />
    </div>
  );
}
