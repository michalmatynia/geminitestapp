'use client';

import React from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

interface GlobalSettingsProps {
  loading: boolean;
  saving: boolean;
  draftNodeTypes: string;
  setDraftNodeTypes: (val: string) => void;
  draftResolverIds: string;
  setDraftResolverIds: (val: string) => void;
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function GlobalKernelSettings({
  loading,
  saving,
  draftNodeTypes,
  setDraftNodeTypes,
  draftResolverIds,
  setDraftResolverIds,
  isDirty,
  onSave,
}: GlobalSettingsProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1'>
      <span className='text-[10px] uppercase tracking-wide text-cyan-100'>
          Runtime Kernel Global
      </span>
      <StatusBadge
        status='Strict Native: On (fixed)'
        variant='success'
        size='sm'
        className='h-8 border border-cyan-500/50 bg-card/60 px-2 text-[11px] text-cyan-100'
      />
      <input
        data-doc-id='canvas_runtime_kernel_node_types'
        type='text'
        value={draftNodeTypes}
        onChange={(event) => {
          setDraftNodeTypes(event.target.value);
        }}
        aria-label='Runtime kernel node types'
        placeholder='kernel nodes: constant, math'
        disabled={loading || saving}
        className='h-8 w-[220px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
      />
      <input
        data-doc-id='canvas_runtime_kernel_resolver_ids'
        type='text'
        value={draftResolverIds}
        onChange={(event) => {
          setDraftResolverIds(event.target.value);
        }}
        aria-label='Runtime kernel resolver ids'
        placeholder='resolvers: kernel.primary, kernel.fallback'
        disabled={loading || saving}
        className='h-8 w-[260px] rounded-md border border-cyan-500/40 bg-card/60 px-2 text-[11px] text-cyan-50 outline-none ring-offset-background placeholder:text-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2'
      />
      <Button
        data-doc-id='canvas_runtime_kernel_apply'
        type='button'
        className='h-8 rounded-md border border-cyan-400/50 px-2 text-[11px] text-cyan-100 hover:bg-cyan-500/20'
        onClick={() => {
          onSave().catch(logClientError);
        }}
        disabled={loading || saving || !isDirty}
      >
        {saving ? 'Saving...' : 'Apply'}
      </Button>
    </div>
  );
}
