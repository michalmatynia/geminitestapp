import React from 'react';

import type { KangurPageContentFragment } from '@/shared/contracts/kangur-page-content';
import { Badge, Button, Card, FormField, Input, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface KangurPageContentFragmentEditorProps {
  fragments: KangurPageContentFragment[];
  selectedFragmentId: string | null;
  onSelectFragment: (id: string) => void;
  onUpdateFragment: (updater: (fragment: KangurPageContentFragment) => KangurPageContentFragment) => void;
  onAddFragment: () => void;
  onDuplicateFragment: () => void;
  onDeleteFragment: () => void;
  onMoveFragment: (direction: -1 | 1) => void;
  isSaving: boolean;
  className?: string;
}

const sanitizeRequiredInput = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const stringifyList = (values: readonly string[]): string => values.join('\n');

const parseList = (value: string): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const token of value.split(/\r?\n|,/g)) {
    const trimmed = token.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

export function KangurPageContentFragmentEditor({
  fragments,
  selectedFragmentId,
  onSelectFragment,
  onUpdateFragment,
  onAddFragment,
  onDuplicateFragment,
  onDeleteFragment,
  onMoveFragment,
  isSaving,
  className,
}: KangurPageContentFragmentEditorProps): React.JSX.Element {
  const selectedFragment = fragments.find((f) => f.id === selectedFragmentId) ?? null;

  return (
    <Card variant='subtle' padding='md' className={className}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='text-sm font-semibold text-foreground'>
              Highlighted text fragments
            </div>
            <Badge variant='outline'>{fragments.length} fragments</Badge>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>
            Use fragments for exact highlighted text that should resolve to a
            canned Mongo explanation before the tutor falls back to the model.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' onClick={() => onMoveFragment(-1)} disabled={isSaving || !selectedFragment}>
            Move up
          </Button>
          <Button variant='outline' size='sm' onClick={() => onMoveFragment(1)} disabled={isSaving || !selectedFragment}>
            Move down
          </Button>
          <Button variant='outline' size='sm' onClick={onAddFragment} disabled={isSaving}>
            Add fragment
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={onDuplicateFragment}
            disabled={isSaving || !selectedFragment}
          >
            Duplicate
          </Button>
          <Button
            variant='ghost'
            size='sm'
            onClick={onDeleteFragment}
            disabled={isSaving || !selectedFragment}
          >
            Delete
          </Button>
        </div>
      </div>

      {fragments.length > 0 ? (
        <div className='mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
          <div className='space-y-2'>
            {fragments.map((fragment) => {
              const isSelected = fragment.id === selectedFragmentId;
              return (
                <button
                  key={fragment.id}
                  type='button'
                  onClick={() => onSelectFragment(fragment.id)}
                  className={cn(
                    'w-full rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border/60 bg-card/30 hover:bg-card/55'
                  )}
                  aria-label={
                    fragment.text?.trim()
                      ? `Fragment: ${fragment.text}`
                      : `Fragment ${fragment.id}`
                  }
                  title={
                    fragment.text?.trim()
                      ? `Fragment: ${fragment.text}`
                      : `Fragment ${fragment.id}`
                  }
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium text-foreground'>
                        {fragment.text}
                      </div>
                      <div className='mt-1 truncate font-mono text-[11px] text-muted-foreground'>
                        {fragment.id}
                      </div>
                    </div>
                    {!fragment.enabled ? <Badge variant='warning'>Disabled</Badge> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedFragment ? (
            <div className='space-y-4'>
              <div className='grid gap-4 lg:grid-cols-2'>
                <FormField
                  label='Fragment id'
                  description='Stable fragment key used inside the page-content source path.'
                >
                  <Input
                    aria-label='Page content fragment id'
                    value={selectedFragment.id}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        id: sanitizeRequiredInput(event.target.value, fragment.id),
                      }))
                    }
                    title='Fragment id'
                  />
                </FormField>

                <FormField
                  label='Highlighted text'
                  description='Canonical text expected to be selected on the page.'
                >
                  <Input
                    aria-label='Page content fragment text'
                    value={selectedFragment.text}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        text: sanitizeRequiredInput(event.target.value, fragment.text),
                      }))
                    }
                    title='Highlighted text'
                  />
                </FormField>

                <FormField label='Aliases'>
                  <Textarea
                    aria-label='Page content fragment aliases'
                    value={stringifyList(selectedFragment.aliases)}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        aliases: parseList(event.target.value),
                      }))
                    }
                    rows={4}
                    title='Aliases'
                  />
                </FormField>

                <FormField label='Linked native guide ids'>
                  <Textarea
                    aria-label='Page content fragment native guide ids'
                    value={stringifyList(selectedFragment.nativeGuideIds)}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        nativeGuideIds: parseList(event.target.value),
                      }))
                    }
                    rows={4}
                    title='Linked native guide ids'
                  />
                </FormField>

                <FormField label='Trigger phrases'>
                  <Textarea
                    aria-label='Page content fragment trigger phrases'
                    value={stringifyList(selectedFragment.triggerPhrases)}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        triggerPhrases: parseList(event.target.value),
                      }))
                    }
                    rows={4}
                    title='Trigger phrases'
                  />
                </FormField>

                <FormField label='Explanation' className='lg:col-span-2'>
                  <Textarea
                    aria-label='Page content fragment explanation'
                    value={selectedFragment.explanation}
                    onChange={(event) =>
                      onUpdateFragment((fragment) => ({
                        ...fragment,
                        explanation: sanitizeRequiredInput(
                          event.target.value,
                          fragment.explanation
                        ),
                      }))
                    }
                    rows={6}
                    title='Explanation'
                  />
                </FormField>
              </div>

              <div className='flex items-center justify-between rounded-2xl border border-border/60 bg-card/30 px-4 py-3'>
                <div>
                  <div className='text-sm font-medium text-foreground'>
                    Fragment enabled
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    Disabled fragments stay in Mongo but do not participate in
                    highlighted-text matching.
                  </div>
                </div>
                <Switch
                  checked={selectedFragment.enabled}
                  onCheckedChange={(checked: boolean) =>
                    onUpdateFragment((fragment) => ({
                      ...fragment,
                      enabled: checked,
                    }))
                  }
                />
              </div>
            </div>
          ) : (
            <div className='rounded-2xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground'>
              Select a fragment to edit it.
            </div>
          )}
        </div>
      ) : (
        <div className='mt-4 rounded-2xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground'>
          Add a fragment when a specific highlighted text on the page needs its own
          explanation, aliases, or linked guide ids.
        </div>
      )}
    </Card>
  );
}
