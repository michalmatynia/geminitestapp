'use client';

import { Copy, Crosshair, Focus, Info, Layers, MousePointer2, RefreshCw } from 'lucide-react';
import React from 'react';

import { readMeta } from '@/features/ai/image-studio/utils/metadata';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { Button } from '@/shared/ui/primitives.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';

import { useVersionGraphInspectorContext } from './VersionGraphInspectorContext';
import { useSettingsState } from '../context/SettingsContext';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphInspector(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
  const {
    selectedNode,
    compositeLoading,
    compositeBusy,
    getSlotImageSrc,
    onFlattenComposite,
    onRefreshCompositePreview,
    onSelectNode,
    onOpenDetails,
    onFocusNode,
    onIsolateBranch,
    annotationDraft,
    onAnnotationChange,
    onAnnotationBlur,
  } = useVersionGraphInspectorContext();
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = React.useMemo(
    () => ({
      openDetails: getImageStudioDocTooltip('version_graph_inspector_open_details'),
      flattenComposite: getImageStudioDocTooltip('version_graph_inspector_flatten_composite'),
      refreshCompositePreview: getImageStudioDocTooltip(
        'version_graph_inspector_refresh_composite_preview'
      ),
      goToParent: getImageStudioDocTooltip('version_graph_inspector_go_to_parent'),
      focusNode: getImageStudioDocTooltip('version_graph_inspector_focus_node'),
      isolateBranch: getImageStudioDocTooltip('version_graph_inspector_isolate_branch'),
      copyNodeId: getImageStudioDocTooltip('version_graph_inspector_copy_node_id'),
      detailsButton: getImageStudioDocTooltip('version_graph_inspector_details_button'),
    }),
    []
  );

  if (!selectedNode) {
    return (
      <div className='border-t border-border/40 px-3 py-2 text-[10px] text-gray-500'>
        Click a node to inspect. Use the info icon above the thumbnail for full details.
      </div>
    );
  }

  const meta = readMeta(selectedNode.slot);

  return (
    <div className='border-t border-border/40 p-3'>
      <div className='flex gap-3'>
        {/* Thumbnail */}
        <div className='flex-shrink-0'>
          {onOpenDetails ? (
            <div className='mb-1 flex justify-end'>
              <button
                type='button'
                className='inline-flex h-5 w-5 items-center justify-center rounded border border-blue-400/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:text-blue-200'
                title={versionGraphTooltipsEnabled ? tooltipContent.openDetails : undefined}
                aria-label='Open full node/file details'
                onClick={() => onOpenDetails(selectedNode.id)}
              >
                <Info className='size-3' />
              </button>
            </div>
          ) : (
            <div className='mb-1 h-5' />
          )}
          <div className='size-[72px] overflow-hidden rounded border border-border/60 bg-card/30'>
            {getSlotImageSrc(selectedNode.slot) ? (
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
        </div>

        {/* Details */}
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='truncate text-xs font-medium text-gray-200'>{selectedNode.label}</div>
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
          {selectedNode.type === 'composite'
            ? (() => {
              const layerCount = meta.compositeConfig?.layers?.length ?? 0;
              return layerCount > 0 ? (
                <div className='text-[10px] text-teal-400'>
                  <Layers className='mr-0.5 inline size-2.5' />
                  {layerCount} layers
                  {compositeLoading ? ' · Loading...' : ''}
                </div>
              ) : null;
            })()
            : null}
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
            <div
              className='truncate text-[10px] text-gray-500'
              title={meta.generationParams.prompt}
            >
              Prompt: {meta.generationParams.prompt.slice(0, 60)}
              {meta.generationParams.prompt.length > 60 ? '...' : ''}
            </div>
          ) : null}
          {selectedNode.parentIds.length > 0 ? (
            <button
              type='button'
              className='text-[10px] text-blue-400 hover:underline'
              title={versionGraphTooltipsEnabled ? tooltipContent.goToParent : undefined}
              onClick={() => onSelectNode(selectedNode.parentIds[0] ?? null)}
            >
              <MousePointer2 className='mr-0.5 inline size-2.5' />
              Go to parent
            </button>
          ) : null}
        </div>
      </div>

      <div className='mt-2 flex gap-2'>
        {selectedNode.type === 'composite' ? (
          <Button
            size='xs'
            variant='outline'
            className='flex-1 border-teal-400/40 text-xs text-teal-400 hover:bg-teal-500/10'
            disabled={compositeBusy || compositeLoading}
            title={versionGraphTooltipsEnabled ? tooltipContent.flattenComposite : undefined}
            onClick={() => {
              onFlattenComposite(selectedNode.id);
            }}
          >
            <Layers className='mr-1.5 size-3' />
            Flatten
          </Button>
        ) : null}
        {selectedNode.type === 'composite' && onRefreshCompositePreview ? (
          <Button
            size='xs'
            variant='ghost'
            className='size-7 text-teal-400'
            title={versionGraphTooltipsEnabled ? tooltipContent.refreshCompositePreview : undefined}
            disabled={compositeBusy || compositeLoading}
            onClick={() => onRefreshCompositePreview(selectedNode.id)}
            loading={compositeLoading}
            aria-label={versionGraphTooltipsEnabled ? tooltipContent.refreshCompositePreview : undefined}>
            <RefreshCw className='size-3' />
          </Button>
        ) : null}
      </div>

      {/* Composite layer controls */}
      {selectedNode.type === 'composite' && meta.compositeConfig?.layers ? (
        <div className='mt-2 space-y-1'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Layers
          </Hint>
          {meta.compositeConfig.layers.map((layer, idx) => (
            <div key={layer.slotId} className='flex items-center gap-1.5 text-[10px] text-gray-400'>
              <span className='w-4 text-right text-gray-600'>{idx + 1}</span>
              <span className='min-w-0 flex-1 truncate'>{layer.slotId.slice(0, 8)}</span>
              <span className='text-[9px] text-gray-600'>
                {Math.round((layer.opacity ?? 1) * 100)}%
              </span>
              <span className='text-[9px] text-gray-600'>{layer.blendMode ?? 'normal'}</span>
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
            title={versionGraphTooltipsEnabled ? tooltipContent.focusNode : undefined}
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
            title={versionGraphTooltipsEnabled ? tooltipContent.isolateBranch : undefined}
            onClick={() => onIsolateBranch(selectedNode.id)}
          >
            <Crosshair className='size-2.5' />
            Isolate
          </button>
        ) : null}
        <button
          type='button'
          className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-gray-500 hover:bg-accent hover:text-gray-300'
          title={versionGraphTooltipsEnabled ? tooltipContent.copyNodeId : undefined}
          onClick={() => void navigator.clipboard.writeText(selectedNode.id)}
        >
          <Copy className='size-2.5' />
          Copy ID
        </button>
        {onOpenDetails ? (
          <button
            type='button'
            className='flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
            title={versionGraphTooltipsEnabled ? tooltipContent.detailsButton : undefined}
            onClick={() => onOpenDetails(selectedNode.id)}
          >
            Details
          </button>
        ) : null}
      </div>

      {/* Annotation */}
      <div className='mt-2'>
        <textarea
          value={annotationDraft}
          onChange={(e) => onAnnotationChange(e.target.value)}
          onBlur={onAnnotationBlur}
          placeholder='Add note...'
          aria-label='Add note'
          rows={2}
          className='w-full resize-none rounded border border-border/40 bg-transparent px-2 py-1 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        />
      </div>
    </div>
  );
}
