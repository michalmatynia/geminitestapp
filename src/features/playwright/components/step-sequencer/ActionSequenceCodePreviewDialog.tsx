'use client';

import { Copy, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { PlaywrightResolvedActionBlock } from '@/features/playwright/context/PlaywrightStepSequencerContext.types';
import { fetchPlaywrightActionSnippet } from '@/features/playwright/hooks/usePlaywrightCodeSnippets';
import type { PlaywrightStep } from '@/shared/contracts/playwright-steps';
import type {
  PlaywrightActionSequenceSnippetResponse,
  PlaywrightStepSet,
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

type ActionPreviewEntry = {
  id: string;
  label: string;
  source: 'direct_step' | 'step_set_step' | 'runtime_step' | 'missing' | 'disabled';
  semanticSnippet: string;
  resolvedSnippet: string;
  moduleKey: string | null;
  registryConnected: boolean;
  unresolvedBindings: string[];
};

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
      <pre className='max-h-80 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-muted-foreground'>
        {code}
      </pre>
    </div>
  );
}

const previewStep = (step: PlaywrightStep, labelPrefix: string): ActionPreviewEntry => {
  const inputBindings = getPlaywrightStepInputBindings(step);
  const snapshot = createPlaywrightStepCodeSnapshot({ ...step, inputBindings });

  return {
    id: step.id,
    label: `${labelPrefix}${step.name}`,
    source: labelPrefix ? 'step_set_step' : 'direct_step',
    semanticSnippet: snapshot.semanticSnippet,
    resolvedSnippet: snapshot.resolvedSnippet,
    moduleKey: snapshot.moduleKey,
    registryConnected: snapshot.selectorBindings.some((binding) => binding.connected),
    unresolvedBindings: snapshot.unresolvedBindings,
  };
};

const previewRuntimeStep = (blockId: string, runtimeStepId: string, label: string): ActionPreviewEntry => ({
  id: blockId,
  label,
  source: 'runtime_step',
  semanticSnippet: `await runtimeSteps[${JSON.stringify(runtimeStepId)}](context);`,
  resolvedSnippet: `await runtimeSteps[${JSON.stringify(runtimeStepId)}](context);`,
  moduleKey: `runtime.${runtimeStepId}`,
  registryConnected: false,
  unresolvedBindings: [],
});

const commentEntry = (
  id: string,
  label: string,
  source: ActionPreviewEntry['source'],
  comment: string
): ActionPreviewEntry => ({
  id,
  label,
  source,
  semanticSnippet: comment,
  resolvedSnippet: comment,
  moduleKey: null,
  registryConnected: false,
  unresolvedBindings: [],
});

export function ActionSequenceCodePreviewDialog({
  actionName,
  blocks,
  steps,
  stepSets,
  open,
  onOpenChange,
}: {
  actionName: string;
  blocks: PlaywrightResolvedActionBlock[];
  steps: PlaywrightStep[];
  stepSets: PlaywrightStepSet[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const [serverPreview, setServerPreview] =
    useState<PlaywrightActionSequenceSnippetResponse | null>(null);
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(null);
  const [isServerPreviewLoading, setIsServerPreviewLoading] = useState(false);

  const entries = useMemo(() => {
    const next: ActionPreviewEntry[] = [];

    blocks.forEach((item, blockIndex) => {
      const blockLabel = item.block.label ?? `Block ${blockIndex + 1}`;

      if (!item.block.enabled) {
        next.push(
          commentEntry(
            item.block.id,
            blockLabel,
            'disabled',
            `// Disabled block ${blockIndex + 1}: ${blockLabel}`
          )
        );
        return;
      }

      if (item.block.kind === 'step') {
        if (item.step) {
          next.push(previewStep(item.step, ''));
        } else {
          next.push(
            commentEntry(
              item.block.id,
              blockLabel,
              'missing',
              `// Missing direct step: ${item.block.refId}`
            )
          );
        }
        return;
      }

      if (item.block.kind === 'step_set') {
        if (!item.stepSet) {
          next.push(
            commentEntry(
              item.block.id,
              blockLabel,
              'missing',
              `// Missing step set: ${item.block.refId}`
            )
          );
          return;
        }

        item.stepSet.stepIds.forEach((stepId, stepIndex) => {
          const step = steps.find((candidate) => candidate.id === stepId);
          if (step) {
            next.push(previewStep(step, `${item.stepSet?.name ?? 'Step set'} / `));
          } else {
            next.push(
              commentEntry(
                `${item.block.id}:${stepId}:${stepIndex}`,
                `${item.stepSet?.name ?? 'Step set'} / missing step`,
                'missing',
                `// Missing step ${stepIndex + 1} in ${item.stepSet?.name ?? item.block.refId}: ${stepId}`
              )
            );
          }
        });
        return;
      }

      if (item.block.kind === 'runtime_step') {
        if (item.runtimeStepId && item.runtimeStepLabel) {
          next.push(previewRuntimeStep(item.block.id, item.runtimeStepId, item.runtimeStepLabel));
        } else {
          next.push(
            commentEntry(
              item.block.id,
              blockLabel,
              'missing',
              `// Missing runtime step: ${item.block.refId}`
            )
          );
        }
      }
    });

    return next;
  }, [blocks, steps]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsServerPreviewLoading(true);
    setServerPreviewError(null);

    const runtimeStepLabels = Object.fromEntries(
      blocks
        .filter((item) => item.runtimeStepId && item.runtimeStepLabel)
        .map((item) => [item.runtimeStepId as string, item.runtimeStepLabel as string])
    );

    fetchPlaywrightActionSnippet({
      actionName,
      blocks: blocks.map((item) => item.block),
      steps,
      stepSets,
      ...(Object.keys(runtimeStepLabels).length > 0 ? { runtimeStepLabels } : {}),
    })
      .then((response) => {
        if (!cancelled) setServerPreview(response);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setServerPreview(null);
          setServerPreviewError(
            error instanceof Error ? error.message : 'Unable to load server action preview.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsServerPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [actionName, blocks, open, stepSets, steps]);

  const displayEntries = serverPreview?.entries ?? entries;

  const semanticCode = useMemo(
    () =>
      entries
        .map(
          (entry, index) =>
            `// ${index + 1}. ${entry.label}\n${entry.semanticSnippet}`
        )
        .join('\n\n'),
    [entries]
  );

  const resolvedCode = useMemo(
    () =>
      entries
        .map(
          (entry, index) =>
            `// ${index + 1}. ${entry.label}\n${entry.resolvedSnippet}`
        )
        .join('\n\n'),
    [entries]
  );

  const displaySemanticCode = serverPreview?.snapshot.semanticSnippet ?? semanticCode;
  const displayResolvedCode = serverPreview?.snapshot.resolvedSnippet ?? resolvedCode;
  const registryCount = displayEntries.filter((entry) => entry.registryConnected).length;
  const unresolvedCount = displayEntries.reduce(
    (total, entry) => total + entry.unresolvedBindings.length,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl'>
        <DialogHeader>
          <DialogTitle>{actionName.trim() || 'Action sequence code preview'}</DialogTitle>
          <DialogDescription>
            Flattened Playwright code preview for the current Action Constructor sequence.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='neutral' className='gap-1'>
              <ListChecks className='size-3' />
              {displayEntries.length} executable preview row{displayEntries.length === 1 ? '' : 's'}
            </Badge>
            <Badge variant='neutral'>
              {isServerPreviewLoading
                ? 'Server preview loading'
                : serverPreview
                  ? 'Server contract preview'
                  : 'Local preview'}
            </Badge>
            {registryCount > 0 ? (
              <Badge className='border-emerald-400/30 bg-emerald-500/10 text-emerald-200'>
                {registryCount} registry-connected step{registryCount === 1 ? '' : 's'}
              </Badge>
            ) : (
              <Badge className='border-slate-400/30 bg-slate-500/10 text-slate-200'>
                No registry-connected selectors
              </Badge>
            )}
            {unresolvedCount > 0 ? (
              <Badge className='border-amber-400/30 bg-amber-500/10 text-amber-100'>
                {unresolvedCount} unresolved binding{unresolvedCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>

          <div className='grid gap-3 xl:grid-cols-2'>
            <CodeBlock
              title='Semantic action code'
              code={displaySemanticCode || '// The action sequence is empty.'}
            />
            <CodeBlock
              title='Resolved action code'
              code={displayResolvedCode || '// The action sequence is empty.'}
            />
          </div>

          {serverPreviewError ? (
            <div className='rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
              Server preview unavailable. Showing local preview. {serverPreviewError}
            </div>
          ) : null}

          {serverPreview?.warnings.length ? (
            <div className='rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100'>
              <div className='mb-2 font-semibold'>Server preview warnings</div>
              <ul className='list-disc space-y-1 pl-4'>
                {serverPreview.warnings.map((warning) => (
                  <li key={`${warning.id}:${warning.label}:${warning.message}`}>
                    {warning.label}: {warning.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className='rounded border border-border/50 bg-card/20 p-3'>
            <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Flattened modules
            </div>
            {displayEntries.length === 0 ? (
              <div className='text-xs text-muted-foreground'>
                Add blocks to the Action Constructor to preview the complete code sequence.
              </div>
            ) : (
              <div className='space-y-2'>
                {displayEntries.map((entry, index) => (
                  <div
                    key={`${entry.id}:${index}`}
                    className='grid gap-2 rounded border border-border/40 bg-background/20 px-3 py-2 text-xs sm:grid-cols-[32px_1fr_170px_120px]'
                  >
                    <div className='font-mono text-muted-foreground'>{index + 1}.</div>
                    <div className='min-w-0'>
                      <div className='truncate font-medium text-foreground'>{entry.label}</div>
                      <div className='truncate text-muted-foreground'>{entry.source}</div>
                    </div>
                    <Badge variant='neutral' className='w-fit'>
                      {entry.moduleKey ?? 'comment'}
                    </Badge>
                    <Badge
                      className={
                        entry.registryConnected
                          ? 'w-fit border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                          : 'w-fit border-slate-400/30 bg-slate-500/10 text-slate-200'
                      }
                    >
                      {entry.registryConnected ? 'Registry' : 'Local'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
