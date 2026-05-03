'use client';

import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface PathSettingsProps {
  activePath: string | null;
  saving: boolean;
  draftNodeTypes: string;
  setDraftNodeTypes: (val: string) => void;
  draftResolverIds: string;
  setDraftResolverIds: (val: string) => void;
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function PathKernelSettings({
  activePath,
  saving,
  draftNodeTypes,
  setDraftNodeTypes,
  draftResolverIds,
  setDraftResolverIds,
  isDirty,
  onSave,
}: PathSettingsProps): React.JSX.Element {
  const isActive = activePath !== null;
  return (
    <div className='flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1'>
      <span className='text-[10px] uppercase tracking-wide text-emerald-100'>Runtime Kernel Path</span>
      <StatusBadge status={isActive ? 'Scope: Active Path' : 'Scope: None'} variant='neutral' size='sm' className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100' />
      <StatusBadge status='Strict Native: On (fixed)' variant='success' size='sm' className='h-8 border border-emerald-500/50 bg-card/60 px-2 text-[11px] text-emerald-100' />
      <input
        data-doc-id='canvas_path_runtime_kernel_node_types'
        type='text'
        value={draftNodeTypes}
        onChange={(event) => setDraftNodeTypes(event.target.value)}
        aria-label='Path runtime kernel node types'
        placeholder='path kernel nodes: template, parser'
        disabled={!isActive || saving}
        className='h-8 w-[220px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
      />
      <input
        data-doc-id='canvas_path_runtime_kernel_resolver_ids'
        type='text'
        value={draftResolverIds}
        onChange={(event) => setDraftResolverIds(event.target.value)}
        aria-label='Path runtime kernel resolver ids'
        placeholder='path resolvers: resolver.path'
        disabled={!isActive || saving}
        className='h-8 w-[240px] rounded-md border border-emerald-500/40 bg-card/60 px-2 text-[11px] text-emerald-50 outline-none ring-offset-background placeholder:text-emerald-200/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2'
      />
      <Button
        data-doc-id='canvas_path_runtime_kernel_apply'
        type='button'
        className='h-8 rounded-md border border-emerald-400/50 px-2 text-[11px] text-emerald-100 hover:bg-emerald-500/20'
        onClick={() => { onSave().catch(logClientError); }}
        disabled={!isActive || saving || !isDirty}
      >
        {saving ? 'Saving...' : 'Apply to Path'}
      </Button>
    </div>
  );
}
