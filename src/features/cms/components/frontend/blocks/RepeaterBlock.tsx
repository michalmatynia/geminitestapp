'use client';

import React from 'react';

import type { BlockInstance } from '@/shared/contracts/cms';

import {
  CmsRuntimeScopeProvider,
  resolveCmsRuntimeCollection,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { useRequiredBlockRenderContext, useRequiredBlockSettings } from './BlockContext';
import { FrontendBlockRenderer } from '../sections/FrontendBlockRenderer';
import { SectionBlockRenderer } from '../sections/grid/SectionBlockRenderer';


const CONTAINER_BLOCK_TYPES = new Set([
  'ImageWithText',
  'Hero',
  'RichText',
  'Block',
  'TextAtom',
  'Carousel',
  'Slideshow',
]);

const resolveJustifyContent = (
  value: unknown
): React.CSSProperties['justifyContent'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'space-between') return 'space-between';
  if (value === 'space-around') return 'space-around';
  if (value === 'space-evenly') return 'space-evenly';
  if (value === 'start') return 'flex-start';
  return undefined;
};

const resolveAlignItems = (value: unknown): React.CSSProperties['alignItems'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'stretch') return 'stretch';
  if (value === 'start') return 'flex-start';
  return undefined;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const resolvePositiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

export function RepeaterBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const { block } = useRequiredBlockRenderContext();
  const runtime = useOptionalCmsRuntime();
  const collectionSource = settings['collectionSource'];
  const collectionPath = settings['collectionPath'];
  const items = React.useMemo(
    () => resolveCmsRuntimeCollection(runtime, collectionSource, collectionPath),
    [collectionPath, collectionSource, runtime]
  );
  const itemLimit = resolvePositiveNumber(settings['itemLimit'], 0);
  const visibleItems = itemLimit > 0 ? items.slice(0, itemLimit) : items;
  const emptyMessage =
    typeof settings['emptyMessage'] === 'string' && settings['emptyMessage'].trim().length > 0
      ? settings['emptyMessage'].trim()
      : '';
  const itemsGap = resolvePositiveNumber(settings['itemsGap'], 16);
  const listDirection = settings['listLayoutDirection'] === 'row' ? 'row' : 'column';
  const listWrap = settings['listWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const listJustifyContent =
    resolveJustifyContent(settings['listJustifyContent']) ?? 'flex-start';
  const listAlignItems = resolveAlignItems(settings['listAlignItems']) ?? 'stretch';
  const itemGap = resolvePositiveNumber(settings['itemGap'], 12);
  const itemDirection = settings['itemLayoutDirection'] === 'row' ? 'row' : 'column';
  const itemWrap = settings['itemWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const justifyContent = resolveJustifyContent(settings['itemJustifyContent']) ?? 'flex-start';
  const alignItems = resolveAlignItems(settings['itemAlignItems']) ?? 'stretch';
  const listWrapperClass =
    listDirection === 'row'
      ? listWrap === 'nowrap'
        ? 'flex flex-row flex-nowrap'
        : 'flex flex-row flex-wrap'
      : 'flex flex-col';
  const itemWrapperClass =
    itemDirection === 'row'
      ? itemWrap === 'nowrap'
        ? 'flex flex-row flex-nowrap'
        : 'flex flex-row flex-wrap'
      : 'flex flex-col';

  if (
    typeof collectionSource !== 'string' ||
    collectionSource.trim().length === 0 ||
    typeof collectionPath !== 'string' ||
    collectionPath.trim().length === 0
  ) {
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
        const itemKey =
          isObjectRecord(item) && typeof item['id'] === 'string'
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
              style={{
                gap: `${itemGap}px`,
                justifyContent,
                alignItems,
              }}
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
