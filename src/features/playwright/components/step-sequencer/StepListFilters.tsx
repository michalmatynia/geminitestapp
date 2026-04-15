'use client';

import { Search, X } from 'lucide-react';

import { PLAYWRIGHT_STEP_TYPE_LABELS, type PlaywrightStepType } from '@/shared/contracts/playwright-steps';
import { Badge } from '@/shared/ui/primitives.public';
import { Button } from '@/shared/ui/primitives.public';
import { Input } from '@/shared/ui/primitives.public';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

const TAG_COLORS = [
  'border-sky-500/50 bg-sky-500/10 text-sky-300',
  'border-purple-500/50 bg-purple-500/10 text-purple-300',
  'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  'border-amber-500/50 bg-amber-500/10 text-amber-300',
  'border-rose-500/50 bg-rose-500/10 text-rose-300',
  'border-cyan-500/50 bg-cyan-500/10 text-cyan-300',
] as const;

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length] ?? TAG_COLORS[0]!;
}

const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [PlaywrightStepType, string][];

export function StepListFilters(): React.JSX.Element {
  const {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterTag,
    setFilterTag,
    filterSharedOnly,
    setFilterSharedOnly,
    filterWebsiteId,
    setFilterWebsiteId,
    filterFlowId,
    setFilterFlowId,
    allTags,
    activeTab,
    websites,
    flows,
  } = usePlaywrightStepSequencer();

  const hasActiveFilters = Boolean(
    searchQuery || filterType || filterTag || filterSharedOnly || filterWebsiteId || filterFlowId
  );

  const websiteFlows = filterWebsiteId
    ? flows.filter((f) => f.websiteId === filterWebsiteId)
    : [];

  return (
    <div className='space-y-2'>
      {/* Search */}
      <div className='relative'>
        <Search className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'steps' ? 'Search steps…' : 'Search step sets…'}
          className='pl-8 pr-8 h-8 text-sm'
          aria-label='Search'
        />
        {searchQuery ? (
          <button
            type='button'
            onClick={() => setSearchQuery('')}
            className='absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
            aria-label='Clear search'
          >
            <X className='size-3.5' />
          </button>
        ) : null}
      </div>

      {/* Website / Flow filter */}
      {websites.length > 0 ? (
        <div className='flex items-center gap-2'>
          <Select
            value={filterWebsiteId ?? '__all__'}
            onValueChange={(v) => {
              setFilterWebsiteId(v === '__all__' ? null : v);
              setFilterFlowId(null);
            }}
          >
            <SelectTrigger className='h-7 flex-1 text-xs'>
              <SelectValue placeholder='All websites' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>All websites</SelectItem>
              {websites.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filterWebsiteId && websiteFlows.length > 0 ? (
            <Select
              value={filterFlowId ?? '__all__'}
              onValueChange={(v) => setFilterFlowId(v === '__all__' ? null : v)}
            >
              <SelectTrigger className='h-7 flex-1 text-xs'>
                <SelectValue placeholder='All flows' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__'>All flows</SelectItem>
                {websiteFlows.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ) : null}

      {/* Type filter — only relevant for steps tab */}
      {activeTab === 'steps' ? (
        <div className='flex flex-wrap gap-1.5'>
          {STEP_TYPES.map(([type, label]) => (
            <button
              key={type}
              type='button'
              onClick={() => setFilterType(filterType === type ? null : type)}
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                filterType === type
                  ? 'border-sky-500/60 bg-sky-500/20 text-sky-300'
                  : 'border-border/50 bg-card/30 text-muted-foreground hover:border-sky-500/40 hover:text-sky-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Shared only toggle */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setFilterSharedOnly(!filterSharedOnly)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
            filterSharedOnly
              ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
              : 'border-border/50 bg-card/30 text-muted-foreground hover:border-emerald-500/40'
          )}
        >
          Shared only
        </button>

        {hasActiveFilters ? (
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2 text-[11px] text-muted-foreground'
            onClick={() => {
              setSearchQuery('');
              setFilterType(null);
              setFilterTag(null);
              setFilterSharedOnly(false);
              setFilterWebsiteId(null);
              setFilterFlowId(null);
            }}
          >
            Clear filters
          </Button>
        ) : null}

        {hasActiveFilters ? (
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            filtered
          </Badge>
        ) : null}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 ? (
        <div className='flex flex-wrap gap-1'>
          {allTags.map((tag) => (
            <button
              key={tag}
              type='button'
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                filterTag === tag
                  ? tagColor(tag)
                  : 'border-border/40 bg-card/20 text-muted-foreground hover:border-border'
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
