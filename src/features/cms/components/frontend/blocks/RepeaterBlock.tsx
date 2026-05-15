'use client';

import React, { useMemo } from 'react';

import type { BlockInstance } from '@/shared/contracts/cms';
import {
  CMS_SECTION_BLOCK_TYPES,
  resolveAlignItems,
  resolveJustifyContent,
} from '@/features/cms/components/shared/layout-utils';

import {
  CmsRuntimeScopeProvider,
  resolveCmsRuntimeCollection,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';
import { FrontendBlockRenderer } from '../sections/FrontendBlockRenderer';
import { SectionBlockRenderer } from '../sections/grid/SectionBlockRenderer';

const CONTAINER_BLOCK_TYPES = new Set(
  CMS_SECTION_BLOCK_TYPES.filter((type) => type !== 'Repeater')
);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolvePositiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

function getFlexClasses(direction: 'row' | 'column', wrap: 'wrap' | 'nowrap'): string {
  if (direction === 'column') return 'flex flex-col';
  return wrap === 'nowrap' ? 'flex flex-row flex-nowrap' : 'flex flex-row flex-wrap';
}

export function RepeaterBlock(): React.JSX.Element | null {
  const settings = useRequiredBlockSettings();
  const { block } = useRequiredBlockRenderContext();
  const runtime = useOptionalCmsRuntime();
  
  const collectionSource = settings['collectionSource'];
  const collectionPath = settings['collectionPath'];
  
  const items = useMemo(
    () => resolveCmsRuntimeCollection(runtime, collectionSource as string, collectionPath as string),
    [collectionPath, collectionSource, runtime]
  );
  
  const itemLimit = resolvePositiveNumber(settings['itemLimit'], 0);
  const visibleItems = itemLimit > 0 ? items.slice(0, itemLimit) : items;
  
  const emptyMessage = typeof settings['emptyMessage'] === 'string' && settings['emptyMessage'].trim().length > 0
    ? settings['emptyMessage'].trim()
    : null;

  const listDirection = settings['listLayoutDirection'] === 'row' ? 'row' : 'column';
  const listWrap = settings['listWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const listJustifyContent = resolveJustifyContent(settings['listJustifyContent']) ?? 'flex-start';
  const listAlignItems = resolveAlignItems(settings['listAlignItems']) ?? 'stretch';
  const itemsGap = resolvePositiveNumber(settings['itemsGap'], 16);

  const itemDirection = settings['itemLayoutDirection'] === 'row' ? 'row' : 'column';
  const itemWrap = settings['itemWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const justifyContent = resolveJustifyContent(settings['itemJustifyContent']) ?? 'flex-start';
  const alignItems = resolveAlignItems(settings['itemAlignItems']) ?? 'stretch';
  const itemGap = resolvePositiveNumber(settings['itemGap'], 12);

  const listWrapperClass = getFlexClasses(listDirection as 'row' | 'column', listWrap as 'wrap' | 'nowrap');
  const itemWrapperClass = getFlexClasses(itemDirection as 'row' | 'column', itemWrap as 'wrap' | 'nowrap');

  if (typeof collectionSource !== 'string' || collectionSource.trim().length === 0 || 
      typeof collectionPath !== 'string' || collectionPath.trim().length === 0) {
    return null;
  }

  if (visibleItems.length === 0) {
    return emptyMessage ? (
      <div className='cms-appearance-muted-text text-sm'>{emptyMessage}</div>
    ) : null;
  }

  return (
    <div
      className={listWrapperClass}
      style={{ gap: `${itemsGap}px`, justifyContent: listJustifyContent, alignItems: listAlignItems }}
    >
      {visibleItems.map((item: unknown, index: number) => {
        const itemKey = isObjectRecord(item) && typeof item['id'] === 'string'
            ? item['id']
            : `${block.id}-item-${index}`;

        return (
          <CmsRuntimeScopeProvider
            key={itemKey}
            sources={{
              item,
              itemIndex: index,
            }}
          >
            <div
              className={itemWrapperClass}
              style={{ gap: `${itemGap}px`, justifyContent, alignItems }}
            >
              {(block.blocks ?? []).map((child: BlockInstance) =>
                CONTAINER_BLOCK_TYPES.has(child.type) ? (
                  <SectionBlockRenderer key={child.id} block={child} />
                ) : (
                  <FrontendBlockRenderer key={child.id} block={child} />
                )
              )}
            </div>
          </CmsRuntimeScopeProvider>
        );
      })}
    </div>
  );
}
