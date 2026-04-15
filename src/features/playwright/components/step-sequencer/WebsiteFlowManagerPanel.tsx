'use client';

import { ChevronDown, ChevronRight, Globe, Plus, Route, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { PlaywrightFlow, PlaywrightWebsite } from '@/shared/contracts/playwright-steps';
import { Button } from '@/shared/ui/primitives.public';
import { Input } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

// ---------------------------------------------------------------------------
// Inline create-flow row
// ---------------------------------------------------------------------------

function AddFlowRow({
  websiteId,
  onDone,
}: {
  websiteId: string;
  onDone: () => void;
}): React.JSX.Element {
  const { handleCreateFlow, isSaving } = usePlaywrightStepSequencer();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    await handleCreateFlow({ name: trimmed, websiteId, description: description.trim() || null });
    onDone();
  }

  return (
    <div className='mt-1.5 flex items-center gap-1.5 rounded-md border border-border/40 bg-card/20 p-1.5'>
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') onDone();
        }}
        placeholder='Flow name…'
        className='h-6 flex-1 text-xs'
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') onDone();
        }}
        placeholder='Description (optional)…'
        className='h-6 w-[160px] text-xs'
      />
      <Button
        size='sm'
        className='h-6 px-2 text-xs'
        onClick={() => void submit()}
        disabled={!name.trim() || isSaving}
      >
        Add
      </Button>
      <Button
        size='sm'
        variant='ghost'
        className='h-6 px-2 text-xs'
        onClick={onDone}
      >
        Cancel
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow row
// ---------------------------------------------------------------------------

function FlowRow({ flow }: { flow: PlaywrightFlow }): React.JSX.Element {
  const { handleDeleteFlow } = usePlaywrightStepSequencer();

  return (
    <div className='group flex items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-white/5'>
      <Route className='size-3 shrink-0 text-purple-400' />
      <span className='flex-1 text-muted-foreground'>{flow.name}</span>
      {flow.description ? (
        <span className='truncate text-[10px] text-muted-foreground/50'>{flow.description}</span>
      ) : null}
      <button
        type='button'
        onClick={() => void handleDeleteFlow(flow.id)}
        className='ml-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100'
        title='Delete flow'
        aria-label={`Delete flow ${flow.name}`}
      >
        <Trash2 className='size-3' />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Website row (collapsible)
// ---------------------------------------------------------------------------

function WebsiteRow({ website }: { website: PlaywrightWebsite }): React.JSX.Element {
  const { flows, handleDeleteWebsite } = usePlaywrightStepSequencer();
  const [expanded, setExpanded] = useState(false);
  const [addingFlow, setAddingFlow] = useState(false);

  const siteFlows = flows.filter((f) => f.websiteId === website.id);

  return (
    <div className='rounded-md border border-border/30 bg-card/20'>
      {/* Header */}
      <div className='group flex items-center gap-1.5 px-2 py-1.5'>
        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          className='flex flex-1 items-center gap-1.5 text-xs font-medium'
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className='size-3.5 shrink-0 text-muted-foreground' />
          ) : (
            <ChevronRight className='size-3.5 shrink-0 text-muted-foreground' />
          )}
          <Globe className='size-3.5 shrink-0 text-sky-400' />
          <span>{website.name}</span>
          {website.baseUrl ? (
            <span className='text-[10px] text-muted-foreground/50'>{website.baseUrl}</span>
          ) : null}
          <span className='ml-1 rounded-full bg-white/10 px-1.5 text-[10px] text-muted-foreground'>
            {siteFlows.length} flow{siteFlows.length !== 1 ? 's' : ''}
          </span>
        </button>
        <Button
          size='sm'
          variant='ghost'
          className='h-6 gap-0.5 px-1.5 text-[10px] text-sky-400 opacity-0 transition-opacity hover:text-sky-300 group-hover:opacity-100'
          onClick={() => {
            setExpanded(true);
            setAddingFlow(true);
          }}
          title='Add flow to this website'
        >
          <Plus className='size-3' />
          Flow
        </Button>
        <button
          type='button'
          onClick={() => void handleDeleteWebsite(website.id)}
          className='text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100'
          title='Delete website (and its flows)'
          aria-label={`Delete website ${website.name}`}
        >
          <Trash2 className='size-3.5' />
        </button>
      </div>

      {/* Flows */}
      {expanded ? (
        <div className='border-t border-border/20 px-2 pb-1.5 pt-1'>
          {siteFlows.length === 0 && !addingFlow ? (
            <p className='py-1 text-[11px] text-muted-foreground/50'>No flows yet.</p>
          ) : null}
          {siteFlows.map((f) => (
            <FlowRow key={f.id} flow={f} />
          ))}
          {addingFlow ? (
            <AddFlowRow websiteId={website.id} onDone={() => setAddingFlow(false)} />
          ) : (
            <button
              type='button'
              onClick={() => setAddingFlow(true)}
              className='mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-sky-300'
            >
              <Plus className='size-3' />
              Add flow
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-website inline row
// ---------------------------------------------------------------------------

function AddWebsiteRow({ onDone }: { onDone: () => void }): React.JSX.Element {
  const { handleCreateWebsite, isSaving } = usePlaywrightStepSequencer();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;
    await handleCreateWebsite({ name: trimmed, baseUrl: baseUrl.trim() || null });
    onDone();
  }

  return (
    <div className='flex items-center gap-1.5 rounded-md border border-border/40 bg-card/20 p-1.5'>
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') onDone();
        }}
        placeholder='Website name…'
        className='h-6 flex-1 text-xs'
      />
      <Input
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') onDone();
        }}
        placeholder='Base URL (optional)…'
        className='h-6 w-[180px] text-xs'
      />
      <Button
        size='sm'
        className='h-6 px-2 text-xs'
        onClick={() => void submit()}
        disabled={!name.trim() || isSaving}
      >
        Add
      </Button>
      <Button
        size='sm'
        variant='ghost'
        className='h-6 px-2 text-xs'
        onClick={onDone}
      >
        Cancel
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function WebsiteFlowManagerPanel(): React.JSX.Element {
  const { websites } = usePlaywrightStepSequencer();
  const [collapsed, setCollapsed] = useState(false);
  const [addingWebsite, setAddingWebsite] = useState(false);

  return (
    <section>
      {/* Section heading */}
      <div className='mb-2 flex items-center justify-between gap-2'>
        <button
          type='button'
          onClick={() => setCollapsed((v) => !v)}
          className='flex items-center gap-1.5 text-sm font-semibold text-foreground'
        >
          {collapsed ? (
            <ChevronRight className='size-3.5 text-muted-foreground' />
          ) : (
            <ChevronDown className='size-3.5 text-muted-foreground' />
          )}
          Websites &amp; Flows
          <span
            className={cn(
              'rounded-full bg-white/10 px-1.5 text-[10px] font-normal text-muted-foreground',
            )}
          >
            {websites.length}
          </span>
        </button>
        {!collapsed ? (
          <Button
            size='sm'
            variant='outline'
            className='h-6 gap-1 text-xs'
            onClick={() => setAddingWebsite(true)}
          >
            <Plus className='size-3' />
            Add Website
          </Button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className='space-y-1.5'>
          {websites.length === 0 && !addingWebsite ? (
            <p className='text-xs text-muted-foreground/60'>
              No websites yet. Add one to scope steps and flows to a specific site.
            </p>
          ) : null}
          {websites.map((w) => (
            <WebsiteRow key={w.id} website={w} />
          ))}
          {addingWebsite ? (
            <AddWebsiteRow onDone={() => setAddingWebsite(false)} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
