'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useTraderaSelectorRegistry } from '@/features/integrations/hooks/useTraderaSelectorRegistry';
import { fetchPlaywrightStepSnippet } from '@/features/playwright/hooks/usePlaywrightCodeSnippets';
import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStep,
  type PlaywrightStepSnippetResponse,
  type PlaywrightStepInputBinding,
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

const SELECTOR_REGISTRY_HREF = '/admin/integrations/marketplaces/tradera/selectors';

function CopySnippetButton({ value }: { value: string }): React.JSX.Element {
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

function CodeBlock({
  title,
  code,
}: {
  title: string;
  code: string;
}): React.JSX.Element {
  return (
    <div className='rounded border border-border/50 bg-black/20'>
      <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
        <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {title}
        </div>
        <CopySnippetButton value={code} />
      </div>
      <pre className='max-h-64 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed text-muted-foreground'>
        {code}
      </pre>
    </div>
  );
}

const bindingLabel = (binding: PlaywrightStepInputBinding): string => {
  if (binding.mode === 'selectorRegistry') {
    return binding.selectorKey ? `Registry: ${binding.selectorKey}` : 'Registry: unresolved key';
  }
  if (binding.mode === 'runtimeVariable') {
    return binding.variableKey ? `Runtime: ${binding.variableKey}` : 'Runtime: unresolved variable';
  }
  if (binding.mode === 'computed') {
    return binding.expression ? `Computed: ${binding.expression}` : 'Computed: unresolved expression';
  }
  if (binding.mode === 'disabled') {
    return binding.disabledReason ?? 'Disabled';
  }
  if (typeof binding.value === 'string') return binding.value;
  if (typeof binding.value === 'number' || typeof binding.value === 'boolean') {
    return String(binding.value);
  }
  return 'Literal';
};

export function StepCodePreviewDialog({
  step,
  open,
  onOpenChange,
}: {
  step: PlaywrightStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const [serverPreview, setServerPreview] = useState<PlaywrightStepSnippetResponse | null>(null);
  const [serverPreviewError, setServerPreviewError] = useState<string | null>(null);
  const [isServerPreviewLoading, setIsServerPreviewLoading] = useState(false);
  const bindings = useMemo(() => (step ? getPlaywrightStepInputBindings(step) : {}), [step]);
  const registryQuery = useTraderaSelectorRegistry();
  const localSnapshot = useMemo(
    () => (step ? createPlaywrightStepCodeSnapshot({ ...step, inputBindings: bindings }) : null),
    [bindings, step]
  );
  const snapshot = serverPreview?.snapshot ?? localSnapshot;
  const displayBindings = serverPreview?.inputBindings ?? bindings;
  const bindingEntries = Object.entries(displayBindings);

  useEffect(() => {
    if (!open || !step) return;

    let cancelled = false;
    setServerPreview(null);
    setIsServerPreviewLoading(true);
    setServerPreviewError(null);

    fetchPlaywrightStepSnippet({ step })
      .then((response) => {
        if (!cancelled) setServerPreview(response);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setServerPreview(null);
          setServerPreviewError(
            error instanceof Error ? error.message : 'Unable to load server step preview.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsServerPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, step]);

  const liveSelectorRegistryMatches = useMemo(() => {
    if (!snapshot) return [];
    const entries = registryQuery.data?.entries ?? [];
    return snapshot.selectorBindings
      .filter((binding) => binding.mode === 'selectorRegistry')
      .map((binding) => {
        const exact = entries.find(
          (entry) =>
            entry.kind === 'selectors' &&
            entry.key === binding.selectorKey &&
            entry.profile === binding.selectorProfile
        );
        const fallback = entries.find(
          (entry) => entry.kind === 'selectors' && entry.key === binding.selectorKey
        );
        return {
          binding,
          entry: exact ?? fallback ?? null,
        };
      });
  }, [registryQuery.data?.entries, snapshot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{step?.name ?? 'Step code preview'}</DialogTitle>
          <DialogDescription>
            Semantic Playwright preview, resolved code, and modular dynamic input bindings.
          </DialogDescription>
        </DialogHeader>

        {!step || !snapshot ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>
            Select a step to preview its Playwright code.
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='neutral'>{PLAYWRIGHT_STEP_TYPE_LABELS[step.type]}</Badge>
              <Badge variant='neutral'>{snapshot.moduleKey}</Badge>
              <Badge variant='neutral'>
                {isServerPreviewLoading
                  ? 'Server preview loading'
                  : serverPreview
                    ? 'Server contract preview'
                    : 'Local preview'}
              </Badge>
              {snapshot.selectorBindings.some((binding) => binding.connected) ? (
                <Badge className='border-emerald-400/30 bg-emerald-500/10 text-emerald-200'>
                  Registry connected
                </Badge>
              ) : (
                <Badge className='border-slate-400/30 bg-slate-500/10 text-slate-200'>
                  Literal/local bindings
                </Badge>
              )}
              <a
                href={SELECTOR_REGISTRY_HREF}
                className='inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground'
              >
                <ExternalLink className='size-3' />
                Selector registry
              </a>
            </div>

            <div className='grid gap-3 lg:grid-cols-2'>
              <CodeBlock title='Semantic Playwright code' code={snapshot.semanticSnippet} />
              <CodeBlock title='Resolved Playwright code' code={snapshot.resolvedSnippet} />
            </div>

            <div className='rounded border border-border/50 bg-card/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Dynamic bindings
              </div>
              {bindingEntries.length === 0 ? (
                <div className='text-xs text-muted-foreground'>No dynamic bindings for this step.</div>
              ) : (
                <div className='space-y-2'>
                  {bindingEntries.map(([field, binding]) => (
                    <div
                      key={field}
                      className='grid gap-2 rounded border border-border/40 bg-background/20 px-3 py-2 text-xs sm:grid-cols-[120px_140px_1fr]'
                    >
                      <div className='font-medium text-foreground'>{field}</div>
                      <Badge variant='neutral' className='w-fit'>
                        {binding.mode}
                      </Badge>
                      <div className='break-words text-muted-foreground'>{bindingLabel(binding)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {snapshot.unresolvedBindings.length > 0 ? (
              <div className='rounded border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100'>
                Unresolved inputs: {snapshot.unresolvedBindings.join(', ')}
              </div>
            ) : null}

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
                    <li key={`${warning.field}:${warning.message}`}>
                      {warning.field}: {warning.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {liveSelectorRegistryMatches.length > 0 ? (
              <div className='rounded border border-border/50 bg-card/20 p-3'>
                <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Live selector registry context
                </div>
                <div className='space-y-2'>
                  {liveSelectorRegistryMatches.map(({ binding, entry }) => (
                    <div
                      key={`${binding.field}:${binding.selectorKey ?? 'unresolved'}`}
                      className='rounded border border-border/40 bg-background/20 px-3 py-2 text-xs'
                    >
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='neutral'>{binding.field}</Badge>
                        <span className='font-mono text-muted-foreground'>
                          {binding.selectorKey ?? 'unresolved key'}
                        </span>
                        {binding.selectorProfile ? (
                          <Badge variant='neutral'>{binding.selectorProfile}</Badge>
                        ) : null}
                      </div>
                      {entry ? (
                        <div className='mt-2 space-y-1 text-muted-foreground'>
                          <div>
                            Current registry profile: <span className='text-foreground'>{entry.profile}</span>
                          </div>
                          <div className='break-all'>
                            Current preview: {entry.preview.join(', ') || 'No preview available'}
                          </div>
                          <div className='break-all'>
                            Saved fallback: {binding.fallbackSelector ?? 'None'}
                          </div>
                        </div>
                      ) : (
                        <div className='mt-2 text-amber-200'>
                          This selector key is not present in the currently loaded registry response.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
