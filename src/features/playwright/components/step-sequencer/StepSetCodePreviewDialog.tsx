'use client';

import { Copy, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStep,
  type PlaywrightStepSet,
} from '@/shared/contracts/playwright-steps';
import {
  createPlaywrightStepCodeSnapshot,
  getPlaywrightStepInputBindings,
} from '@/shared/lib/playwright/step-code-preview';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives.public';

function CopyButton({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-7 gap-1.5 px-2 text-[11px]'
      onClick={() => {
        if (!navigator.clipboard) return;
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => undefined);
      }}
    >
      <Copy className='size-3' />
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }): React.JSX.Element {
  return (
    <div className='rounded border border-border/50 bg-black/20'>
      <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {title}
        </div>
        <CopyButton value={code} />
      </div>
      <pre className='max-h-72 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-muted-foreground'>
        {code}
      </pre>
    </div>
  );
}

export function StepSetCodePreviewDialog({
  stepSet,
  steps,
  open,
  onOpenChange,
}: {
  stepSet: PlaywrightStepSet | null;
  steps: PlaywrightStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const resolvedSteps = useMemo(() => {
    if (!stepSet) return [];
    return stepSet.stepIds
      .map((stepId) => steps.find((step) => step.id === stepId) ?? null)
      .filter((step): step is PlaywrightStep => step !== null);
  }, [stepSet, steps]);

  const snapshots = useMemo(
    () =>
      resolvedSteps.map((step, index) => {
        const inputBindings = getPlaywrightStepInputBindings(step);
        return {
          step,
          index,
          snapshot: createPlaywrightStepCodeSnapshot({ ...step, inputBindings }),
        };
      }),
    [resolvedSteps]
  );

  const semanticCode = useMemo(
    () =>
      snapshots
        .map(
          ({ step, index, snapshot }) =>
            `// ${index + 1}. ${step.name} (${PLAYWRIGHT_STEP_TYPE_LABELS[step.type]})\n${snapshot.semanticSnippet}`
        )
        .join('\n\n'),
    [snapshots]
  );

  const resolvedCode = useMemo(
    () =>
      snapshots
        .map(
          ({ step, index, snapshot }) =>
            `// ${index + 1}. ${step.name} (${PLAYWRIGHT_STEP_TYPE_LABELS[step.type]})\n${snapshot.resolvedSnippet}`
        )
        .join('\n\n'),
    [snapshots]
  );

  const unresolvedBindings = useMemo(
    () =>
      snapshots.flatMap(({ step, snapshot }) =>
        snapshot.unresolvedBindings.map((binding) => `${step.name}: ${binding}`)
      ),
    [snapshots]
  );

  const registryConnectedCount = snapshots.reduce(
    (count, item) =>
      count + item.snapshot.selectorBindings.filter((binding) => binding.connected).length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>{stepSet?.name ?? 'Step set code preview'}</DialogTitle>
          <DialogDescription>
            Composed semantic and resolved Playwright code for this reusable step set.
          </DialogDescription>
        </DialogHeader>

        {!stepSet ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            Select a step set to preview composed code.
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='neutral' className='gap-1'>
                <Layers className='size-3' />
                {resolvedSteps.length}/{stepSet.stepIds.length} steps
              </Badge>
              {registryConnectedCount > 0 ? (
                <Badge className='border-emerald-400/30 bg-emerald-500/10 text-emerald-200'>
                  {registryConnectedCount} registry binding{registryConnectedCount === 1 ? '' : 's'}
                </Badge>
              ) : (
                <Badge className='border-slate-400/30 bg-slate-500/10 text-slate-200'>
                  Local bindings
                </Badge>
              )}
              {unresolvedBindings.length > 0 ? (
                <Badge className='border-amber-400/30 bg-amber-500/10 text-amber-100'>
                  {unresolvedBindings.length} unresolved
                </Badge>
              ) : null}
            </div>

            <div className='grid gap-3 xl:grid-cols-2'>
              <CodeBlock
                title='Semantic composed code'
                code={semanticCode || '// No available steps in this step set.'}
              />
              <CodeBlock
                title='Resolved composed code'
                code={resolvedCode || '// No available steps in this step set.'}
              />
            </div>

            <div className='rounded border border-border/50 bg-card/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Step modules
              </div>
              {snapshots.length === 0 ? (
                <div className='text-xs text-muted-foreground'>
                  No retained step definitions are available for this step set.
                </div>
              ) : (
                <div className='space-y-2'>
                  {snapshots.map(({ step, index, snapshot }) => (
                    <div
                      key={`${step.id}:${index}`}
                      className='grid gap-2 rounded border border-border/40 bg-background/20 px-3 py-2 text-xs sm:grid-cols-[32px_1fr_160px_120px]'
                    >
                      <div className='font-mono text-muted-foreground'>{index + 1}.</div>
                      <div className='min-w-0'>
                        <div className='truncate font-medium text-foreground'>{step.name}</div>
                        <div className='truncate text-muted-foreground'>
                          {PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}
                        </div>
                      </div>
                      <Badge variant='neutral' className='w-fit'>
                        {snapshot.moduleKey}
                      </Badge>
                      <Badge
                        className={
                          snapshot.selectorBindings.some((binding) => binding.connected)
                            ? 'w-fit border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            : 'w-fit border-slate-400/30 bg-slate-500/10 text-slate-200'
                        }
                      >
                        {snapshot.selectorBindings.some((binding) => binding.connected)
                          ? 'Registry'
                          : 'Local'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
