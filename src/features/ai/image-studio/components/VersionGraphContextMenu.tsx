'use client';

import {
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Crosshair,
  Focus,
  Layers,
} from 'lucide-react';
import React from 'react';

import type { VersionNode } from '../context/VersionGraphContext';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VersionGraphContextMenuProps {
  menu: { nodeId: string; x: number; y: number };
  node: VersionNode;
  collapsedNodeIds: Set<string>;
  compositeMode: boolean;
  compareMode: boolean;
  onClose: () => void;
  onSetAsSource: (nodeId: string) => void;
  onIsolateBranch: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onAddToComposite: (nodeId: string) => void;
  onCompareWith: (nodeId: string) => void;
  onCopyId: (nodeId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphContextMenu({
  menu,
  node,
  collapsedNodeIds,
  onClose,
  onSetAsSource,
  onIsolateBranch,
  onToggleCollapse,
  onAddToComposite,
  onCompareWith,
  onCopyId,
}: VersionGraphContextMenuProps): React.JSX.Element {
  return (
    <>
      <div className='fixed inset-0 z-50' onClick={onClose} role='presentation' />
      <div
        className='fixed z-50 min-w-[140px] rounded border border-border/60 bg-card py-1 shadow-lg'
        style={{ left: menu.x, top: menu.y }}
      >
        <button
          type='button'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
          onClick={() => {
            onSetAsSource(menu.nodeId);
            onClose();
          }}
        >
          <Crosshair className='size-3' />
          Set as Source
        </button>
        <button
          type='button'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
          onClick={() => {
            onIsolateBranch(menu.nodeId);
            onClose();
          }}
        >
          <Focus className='size-3' />
          Isolate Branch
        </button>
        {node.childIds.length > 0 ? (
          <button
            type='button'
            className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
            onClick={() => {
              onToggleCollapse(menu.nodeId);
              onClose();
            }}
          >
            {collapsedNodeIds.has(menu.nodeId) ? (
              <><ChevronDown className='size-3' /> Expand</>
            ) : (
              <><ChevronUp className='size-3' /> Collapse</>
            )}
          </button>
        ) : null}
        {/* Separator */}
        <div className='my-1 border-t border-border/40' />
        <button
          type='button'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-teal-400 hover:bg-accent'
          onClick={() => {
            onAddToComposite(menu.nodeId);
            onClose();
          }}
        >
          <Layers className='size-3' />
          Add to Composite
        </button>
        <button
          type='button'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-cyan-400 hover:bg-accent'
          onClick={() => {
            onCompareWith(menu.nodeId);
            onClose();
          }}
        >
          <Columns2 className='size-3' />
          Compare With...
        </button>
        <div className='my-1 border-t border-border/40' />
        <button
          type='button'
          className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
          onClick={() => {
            onCopyId(menu.nodeId);
            onClose();
          }}
        >
          <Copy className='size-3' />
          Copy ID
        </button>
      </div>
    </>
  );
}
