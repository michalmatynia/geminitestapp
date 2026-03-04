'use client';

import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { Button } from '@/shared/ui';

import { useComponentTreeNodeRuntimeContext } from './ComponentTreeNodeRuntimeContext';
import { SectionDropTarget } from './SectionDropTarget';
import { SectionNodeItem } from './SectionNodeItem';
import { ZoneFooterNode } from './ZoneFooterNode';
import {
  CMS_ZONE_LABELS,
  fromCmsSectionNodeId,
  fromCmsZoneFooterNodeId,
  fromCmsZoneNodeId,
} from '../utils/cms-master-tree';

export type ComponentTreeNodeRendererProps = FolderTreeViewportRenderNodeInput;

export function ComponentTreeNodeRenderer(
  props: ComponentTreeNodeRendererProps
): React.JSX.Element | null {
  const { node, depth, hasChildren, isExpanded, toggleExpand } = props;

  const { rootSectionsByZone, sectionById, sectionIndexById } =
    useComponentTreeNodeRuntimeContext();

  const zoneFromNode = fromCmsZoneNodeId(node.id);
  if (zoneFromNode) {
    const zoneSections = rootSectionsByZone[zoneFromNode];
    return (
      <div className='border-b border-border/50 px-4 py-2.5'>
        <Button
          variant='ghost'
          size='sm'
          onClick={toggleExpand}
          className='flex h-auto w-full items-center justify-start gap-1.5 p-0 text-xs font-semibold uppercase tracking-wider text-gray-400 transition hover:bg-transparent hover:text-gray-300 font-bold'
        >
          <span className='inline-block w-3.5 text-center'>{isExpanded ? '▾' : '▸'}</span>
          <span>{CMS_ZONE_LABELS[zoneFromNode]}</span>
          {zoneSections.length > 0 ? (
            <span className='ml-1 text-[10px] text-gray-500'>({zoneSections.length})</span>
          ) : null}
        </Button>
      </div>
    );
  }

  const sectionId = fromCmsSectionNodeId(node.id);
  if (sectionId) {
    const section = sectionById.get(sectionId);
    if (!section) return null;
    const sectionIndex = sectionIndexById.get(sectionId) ?? 0;
    const nestedOffset = Math.max(0, depth - 1) * 16;
    return (
      <div
        className='px-2'
        style={{ marginLeft: `${nestedOffset}px` }}
        data-cms-tree-depth={String(Math.max(0, depth - 1))}
      >
        <SectionDropTarget
          zone={section.zone}
          toParentSectionId={section.parentSectionId ?? null}
          toIndex={sectionIndex}
        />
        <SectionNodeItem
          section={section}
          sectionIndex={sectionIndex}
          hasTreeChildren={hasChildren}
          isTreeExpanded={isExpanded}
          toggleTreeExpand={toggleExpand}
        />
      </div>
    );
  }

  const zoneFromFooter = fromCmsZoneFooterNodeId(node.id);
  if (!zoneFromFooter) return null;
  return (
    <div className='px-2 pb-2'>
      <ZoneFooterNode
        zone={zoneFromFooter}
        sectionCount={rootSectionsByZone[zoneFromFooter].length}
      />
    </div>
  );
}
