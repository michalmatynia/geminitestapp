'use client';

import { GripVertical, Trash2 } from 'lucide-react';
import React from 'react';

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { FolderTreeViewportRenderNodeInput as PatternNodeItemProps } from '@/shared/lib/foldertree/public';
import { TreeCaret, TreeContextMenu, TreeRow } from '@/shared/ui/tree';

import { cn } from '@/shared/utils/ui-utils';

import { fromPatternMasterNodeId } from '../validator-pattern-master-tree';
import { useValidatorPatternTreeContext } from '../ValidatorPatternTreeContext';
import {
  PatternNodeActions,
  PatternNodeSelectButton,
  PatternNodeSemanticBadge,
} from './PatternNodeItem.parts';

export type { PatternNodeItemProps };

const resolvePatternLabel = (pattern: ProductValidationPattern): string =>
  pattern.label === '' ? pattern.id : pattern.label;

function usePatternFromNode(nodeId: string): ProductValidationPattern | null {
  const { patternById } = useValidatorPatternTreeContext();
  const patternId = fromPatternMasterNodeId(nodeId);
  if (patternId === null || patternId === '') return null;
  return patternById.get(patternId) ?? null;
}

export function PatternNodeItem(props: PatternNodeItemProps): React.JSX.Element | null {
  const { onDeletePattern, onDuplicatePattern, onEditPattern } = useValidatorPatternTreeContext();
  const pattern = usePatternFromNode(props.node.id);
  if (pattern === null) return null;

  return (
    <TreeContextMenu
      items={[
        { id: 'edit-pattern', label: 'Edit pattern', onSelect: (): void => onEditPattern(pattern) },
        {
          id: 'duplicate-pattern',
          label: 'Duplicate pattern',
          onSelect: (): void => onDuplicatePattern(pattern),
        },
        {
          id: 'delete-pattern',
          label: 'Delete pattern',
          icon: <Trash2 className='size-3.5' />,
          tone: 'danger',
          onSelect: (): void => onDeletePattern(pattern),
        },
      ]}
    >
      <TreeRow
        asChild
        depth={props.depth}
        baseIndent={8}
        indent={12}
        tone='subtle'
        selected={props.isSelected}
        selectedClassName='bg-muted text-white hover:bg-muted'
        className={cn('relative h-8 text-xs', props.isDragging && 'opacity-50')}
      >
        <div className='flex h-full w-full min-w-0 items-center gap-1 text-left'>
          <span className='inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
            <GripVertical className='size-3.5 shrink-0 cursor-grab text-gray-500' />
          </span>
          <TreeCaret
            isOpen={props.isExpanded}
            hasChildren={props.hasChildren}
            ariaLabel={props.isExpanded ? `Collapse ${props.node.name}` : `Expand ${props.node.name}`}
            onToggle={props.hasChildren ? props.toggleExpand : undefined}
            className='w-3 text-gray-400'
            buttonClassName='hover:bg-gray-700'
            placeholderClassName='w-3'
          />
          <PatternNodeSelectButton
            isSelected={props.isSelected}
            label={resolvePatternLabel(pattern)}
            pattern={pattern}
            select={props.select}
          />
          <PatternNodeSemanticBadge pattern={pattern} select={props.select} />
          <PatternNodeActions pattern={pattern} />
        </div>
      </TreeRow>
    </TreeContextMenu>
  );
}
