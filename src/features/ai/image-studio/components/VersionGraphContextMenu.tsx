'use client';

import { ChevronDown, ChevronUp, Columns2, Copy, GitBranchPlus, Focus, Layers } from 'lucide-react';
import React from 'react';

import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { Card } from '@/shared/ui/primitives.public';

import { useVersionGraphContextMenuContext } from './VersionGraphContextMenuContext';
import { useSettingsState } from '../context/SettingsContext';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphContextMenu(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
  const {
    menu,
    node,
    collapsedNodeIds,
    onClose,
    onDetachSubtree,
    onIsolateBranch,
    onToggleCollapse,
    onAddToComposite,
    onCompareWith,
    onCopyId,
  } = useVersionGraphContextMenuContext();
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = React.useMemo(
    () => ({
      detachSubtree: getImageStudioDocTooltip('version_graph_context_detach_subtree'),
      isolateNewCard: getImageStudioDocTooltip('version_graph_context_isolate_new_card'),
      toggleCollapse: getImageStudioDocTooltip('version_graph_context_toggle_collapse'),
      addToComposite: getImageStudioDocTooltip('version_graph_context_add_to_composite'),
      compareWith: getImageStudioDocTooltip('version_graph_context_compare_with'),
      copyId: getImageStudioDocTooltip('version_graph_context_copy_id'),
    }),
    []
  );

  return (
    <>
      <button
        type='button'
        className='fixed inset-0 z-50 cursor-pointer border-0 bg-transparent p-0'
        onClick={onClose}
        aria-label='Close context menu'
        tabIndex={-1}
      />
      <Card
        className='fixed z-50 min-w-[140px] py-1 shadow-lg'
        style={{ left: menu.x, top: menu.y }}
        role='menu'
        aria-label='Version graph actions'
        aria-orientation='vertical'
      >
        <button
          type='button'
          role='menuitem'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-amber-300 hover:bg-accent'
          title={versionGraphTooltipsEnabled ? tooltipContent.detachSubtree : undefined}
          onClick={() => {
            onDetachSubtree(menu.nodeId);
            onClose();
          }}
        >
          <GitBranchPlus className='size-3' aria-hidden='true' />
          Detach Subtree
        </button>
        <button
          type='button'
          role='menuitem'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
          title={versionGraphTooltipsEnabled ? tooltipContent.isolateNewCard : undefined}
          onClick={() => {
            onIsolateBranch(menu.nodeId);
            onClose();
          }}
        >
          <Focus className='size-3' aria-hidden='true' />
          Isolate to New Card
        </button>
        {node.childIds.length > 0 ? (
          <button
            type='button'
            role='menuitem'
            className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
            title={versionGraphTooltipsEnabled ? tooltipContent.toggleCollapse : undefined}
            onClick={() => {
              onToggleCollapse(menu.nodeId);
              onClose();
            }}
          >
            {collapsedNodeIds.has(menu.nodeId) ? (
              <>
                <ChevronDown className='size-3' aria-hidden='true' /> Expand
              </>
            ) : (
              <>
                <ChevronUp className='size-3' aria-hidden='true' /> Collapse
              </>
            )}
          </button>
        ) : null}
        {/* Separator */}
        <div className='my-1 border-t border-border/40' />
        <button
          type='button'
          role='menuitem'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-teal-400 hover:bg-accent'
          title={versionGraphTooltipsEnabled ? tooltipContent.addToComposite : undefined}
          onClick={() => {
            onAddToComposite(menu.nodeId);
            onClose();
          }}
        >
          <Layers className='size-3' aria-hidden='true' />
          Add to Composite
        </button>
        <button
          type='button'
          role='menuitem'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-cyan-400 hover:bg-accent'
          title={versionGraphTooltipsEnabled ? tooltipContent.compareWith : undefined}
          onClick={() => {
            onCompareWith(menu.nodeId);
            onClose();
          }}
        >
          <Columns2 className='size-3' aria-hidden='true' />
          Compare With...
        </button>
        <div className='my-1 border-t border-border/40' />
        <button
          type='button'
          role='menuitem'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
          title={versionGraphTooltipsEnabled ? tooltipContent.copyId : undefined}
          onClick={() => {
            onCopyId(menu.nodeId);
            onClose();
          }}
        >
          <Copy className='size-3' aria-hidden='true' />
          Copy ID
        </button>
      </Card>
    </>
  );
}
