'use client';

import { Copy, Crosshair, Focus, Layers, MousePointer2, RefreshCw } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';

import { useVersionGraphInspectorContext } from './VersionGraphInspectorContext';
import { readMeta } from '../utils/metadata';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphInspector(): React.JSX.Element {
  const {
    selectedNode,
    compositeLoading,
    compositeBusy,
    getSlotImageSrc,
    onSetAsSource,
    onFlattenComposite,
    onRefreshCompositePreview,
    onSelectNode,
    onFocusNode,
    onIsolateBranch,
    annotationDraft,
    onAnnotationChange,
    onAnnotationBlur,
  } = useVersionGraphInspectorContext();

  if (!selectedNode) {
    return (
      <div className='border-t border-border/40 px-3 py-2 text-[10px] text-gray-500'>
        Click a node to inspect. Double-click to set as source.
      </div>
    );
  }

  const meta = readMeta(selectedNode.slot);

  return (
    <div className='border-t border-border/40 p-3'>
      <div className='flex gap-3'>
        {/* Thumbnail */}
        <div className='size-[72px] flex-shrink-0 overflow-hidden rounded border border-border/60 bg-card/30'>
          {getSlotImageSrc(selectedNode.slot) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getSlotImageSrc(selectedNode.slot)!}
              alt={selectedNode.label}
              className='h-full w-full object-cover'
            />
          ) : (
            <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
              No image
            </div>
          )}
        </div>

        {/* Details */}
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='truncate text-xs font-medium text-gray-200'>
            {selectedNode.label}
          </div>
          <div className='text-[10px] text-gray-500'>
            {selectedNode.type === 'composite'
              ? 'Composite'
              : selectedNode.type === 'merge'
                ? 'Merge'
                : selectedNode.type === 'generation'
                  ? 'Generation'
                  : 'Base'}{' '}
            {selectedNode.hasMask ? '· Has mask' : ''}
          </div>
          {selectedNode.type === 'composite' ? (() => {
            const layerCount = meta.compositeConfig?.layers?.length ?? 0;
            return layerCount > 0 ? (
              <div className='text-[10px] text-teal-400'>
                <Layers className='mr-0.5 inline size-2.5' />
                {layerCount} layers
                {compositeLoading ? ' · Loading...' : ''}
              </div>
            ) : null;
          })() : null}
          {selectedNode.parentIds.length > 0 ? (
            <div className='text-[10px] text-gray-500'>
              {selectedNode.parentIds.length} parent{selectedNode.parentIds.length !== 1 ? 's' : ''}
            </div>
          ) : null}
          {selectedNode.childIds.length > 0 ? (
            <div className='text-[10px] text-gray-500'>
              {selectedNode.childIds.length} child{selectedNode.childIds.length !== 1 ? 'ren' : ''}
              {selectedNode.descendantCount > selectedNode.childIds.length
                ? ` (${selectedNode.descendantCount} total)`
                : ''}
            </div>
          ) : null}
          {meta.generationParams?.prompt ? (
            <div className='truncate text-[10px] text-gray-500' title={meta.generationParams.prompt}>
              Prompt: {meta.generationParams.prompt.slice(0, 60)}
              {meta.generationParams.prompt.length > 60 ? '...' : ''}
            </div>
          ) : null}
          {selectedNode.parentIds.length > 0 ? (
            <button
              type='button'
              className='text-[10px] text-blue-400 hover:underline'
              onClick={() => onSelectNode(selectedNode.parentIds[0] ?? null)}
            >
              <MousePointer2 className='mr-0.5 inline size-2.5' />
              Go to parent
            </button>
          ) : null}
        </div>
      </div>

      <div className='mt-2 flex gap-2'>
        <Button size='xs'
          variant='outline'
          className='flex-1 text-xs'
          onClick={onSetAsSource}
        >
          <Crosshair className='mr-1.5 size-3' />
          Set as Source
        </Button>
        {selectedNode.type === 'composite' ? (
          <Button size='xs'
            variant='outline'
            className='flex-1 border-teal-400/40 text-xs text-teal-400 hover:bg-teal-500/10'
            disabled={compositeBusy || compositeLoading}
            onClick={() => { onFlattenComposite(selectedNode.id); }}
          >
            <Layers className='mr-1.5 size-3' />
            Flatten
          </Button>
        ) : null}
        {selectedNode.type === 'composite' && onRefreshCompositePreview ? (
          <Button size='xs'
            variant='ghost'
            className='size-7 text-teal-400'
            title='Refresh composite preview'
            disabled={compositeBusy || compositeLoading}
            onClick={() => onRefreshCompositePreview(selectedNode.id)}
          >
            <RefreshCw className={`size-3 ${compositeLoading ? 'animate-spin' : ''}`} />
          </Button>
        ) : null}
      </div>

      {/* Composite layer controls */}
      {selectedNode.type === 'composite' && meta.compositeConfig?.layers ? (
        <div className='mt-2 space-y-1'>
          <div className='text-[9px] font-medium uppercase tracking-wide text-gray-500'>Layers</div>
          {meta.compositeConfig.layers.map((layer, idx) => (
            <div key={layer.slotId} className='flex items-center gap-1.5 text-[10px] text-gray-400'>
              <span className='w-4 text-right text-gray-600'>{idx + 1}</span>
              <span className='min-w-0 flex-1 truncate'>{layer.slotId.slice(0, 8)}</span>
              <span className='text-[9px] text-gray-600'>
                {Math.round((layer.opacity ?? 1) * 100)}%
              </span>
              <span className='text-[9px] text-gray-600'>
                {layer.blendMode ?? 'normal'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Quick actions */}
      <div className='mt-2 flex items-center gap-1'>
        {onFocusNode ? (
          <button
            type='button'
            className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-accent hover:text-gray-300'
            title='Center on this node'
            onClick={() => onFocusNode(selectedNode.id)}
          >
            <Focus className='size-2.5' />
            Focus
          </button>
        ) : null}
        {onIsolateBranch ? (
          <button
            type='button'
            className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-accent hover:text-gray-300'
            title='Isolate this branch'
            onClick={() => onIsolateBranch(selectedNode.id)}
          >
            <Crosshair className='size-2.5' />
            Isolate
          </button>
        ) : null}
        <button
          type='button'
          className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-accent hover:text-gray-300'
          title='Copy node ID'
          onClick={() => void navigator.clipboard.writeText(selectedNode.id)}
        >
          <Copy className='size-2.5' />
          Copy ID
        </button>
      </div>

      {/* Annotation */}
      <div className='mt-2'>
        <textarea
          value={annotationDraft}
          onChange={(e) => onAnnotationChange(e.target.value)}
          onBlur={onAnnotationBlur}
          placeholder='Add note...'
          rows={2}
          className='w-full resize-none rounded border border-border/40 bg-transparent px-2 py-1 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-gray-500 focus:outline-none'
        />
      </div>
    </div>
  );
}
