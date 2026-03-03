'use client';

import { Box, Eye, EyeOff, Trash2, Plus, GripVertical, type LucideIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { isCmsSectionHidden } from '@/features/cms/utils/page-builder-normalization';
import type { SectionInstance } from '@/shared/contracts/cms';
import { Button, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { BlockNodeItem, SectionDropTarget } from './';
import { useComponentTreePanelContext } from './ComponentTreePanelContext';
import { TreeSectionProvider } from './TreeSectionContext';
import { useTreeActions } from '../../../hooks/useTreeActionsContext';
import { SectionPicker } from './SectionPicker';

export function SectionNodeItem({
  section,
  sectionIndex,
}: {
  section: SectionInstance;
  sectionIndex: number;
}): React.JSX.Element {
  const {
    startSectionMasterDrag,
    endSectionMasterDrag,
    draggedMasterSectionId,
    sectionActions,
    blockActions,
    onSelect,
    selectedNodeId,
  } = useComponentTreePanelContext();
  const { expandedIds, toggleExpanded } = useTreeActions();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = expandedIds.has(section.id);
  const isSelected = selectedNodeId === section.id;
  const isDragging = draggedMasterSectionId === section.id;
  const isHidden = isCmsSectionHidden(section.settings['isHidden']);

  const sectionIcon: LucideIcon = Box;

  const dragProps = {
    draggable: true,
    onDragStart: (e: React.DragEvent): void => {
      e.dataTransfer.setData('text/plain', section.id);
      startSectionMasterDrag(section.id);
    },
    onDragEnd: (): void => {
      endSectionMasterDrag();
    },
  };

  return (
    <TreeSectionProvider value={{ sectionId: section.id }}>
      <div
        className={cn(
          'group mb-1 flex flex-col transition-all',
          isDragging ? 'opacity-40 grayscale' : 'opacity-100'
        )}
        onMouseEnter={(): void => setIsHovered(true)}
        onMouseLeave={(): void => setIsHovered(false)}
      >
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border py-1.5 pl-1 pr-2 transition',
            isSelected
              ? 'border-blue-500/50 bg-blue-500/10'
              : 'border-border/40 bg-card/20 hover:border-border/80 hover:bg-card/40'
          )}
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onSelect(section.id);
          }}
        >
          <div
            className='flex h-7 w-5 cursor-grab items-center justify-center text-gray-600 hover:text-gray-400 active:cursor-grabbing'
            {...dragProps}
          >
            <GripVertical className='size-3.5' />
          </div>

          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <sectionIcon className={cn('size-4 shrink-0', isHidden ? 'text-gray-600' : 'text-sky-400/80')} />
            <span className={cn('truncate text-sm font-medium', isHidden ? 'text-gray-500 line-through' : 'text-gray-200')}>
              {section.type}
            </span>
            {isHidden && (
              <Badge variant='neutral' className='bg-gray-800/50 text-[9px] uppercase tracking-wider text-gray-500 h-4 px-1'>
                Hidden
              </Badge>
            )}
          </div>

          <div className='flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.toggleHidden(section.id);
              }}
              className='size-7 p-0 text-gray-500 hover:text-gray-200'
              title={isHidden ? 'Show section' : 'Hide section'}
            >
              {isHidden ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.remove(section.id);
              }}
              className='size-7 p-0 text-gray-500 hover:bg-red-500/10 hover:text-red-400'
              title='Delete section'
            >
              <Trash2 className='size-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={(e: React.MouseEvent): void => {
                e.stopPropagation();
                sectionActions.duplicate(section.id);
              }}
              className='size-7 p-0 text-gray-500 hover:text-gray-200'
              title='Duplicate section'
            >
              <Plus className='size-3.5' />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className='ml-4 mt-1 border-l-2 border-border/20 pl-2'>
            <div className='space-y-1'>
              {section.blocks.map((block, idx) => (
                <BlockNodeItem key={block.id} block={block} index={idx} />
              ))}
            </div>
            <div className='mt-2'>
              <SectionPicker
                disabled={false}
                variant='blocks'
                sectionType={section.type}
                onSelect={(blockType: string) => blockActions.add(section.id, blockType)}
              />
            </div>
          </div>
        )}
      </div>
    </TreeSectionProvider>
  );
}
