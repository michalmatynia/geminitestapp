'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Clipboard,
  Code2,
  DatabaseIcon,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildPlaywrightActionRunMasterNodes,
  decodePlaywrightActionRunNodeId,
} from '@/features/playwright/action-runs-master-tree';
import {
  usePlaywrightActionRun,
  usePlaywrightActionRuns,
} from '@/features/playwright/hooks/usePlaywrightActionRuns';
import { resolvePlaywrightActionRunsHref } from '@/features/playwright/utils/action-runs-links';
import type {
  PlaywrightActionRunRecord,
  PlaywrightActionRunStatus,
  PlaywrightActionRunStepRecord,
  PlaywrightActionRunStepStatus,
} from '@/shared/contracts/playwright-action-runs';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE,
} from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';
import {
  getSelectorRegistryAdminHref,
  inferSelectorRegistryNamespace,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/shared/lib/foldertree/public';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@/shared/ui/primitives.public';
import { MasterTreeSettingsButton } from '@/shared/ui/navigation-and-layout.public';
import { getFolderTreeInstanceSettingsHref } from '@/shared/utils/folder-tree-profiles-v2';
import { cn } from '@/shared/utils/ui-utils';

const HISTORY_TREE_INSTANCE = 'playwright_step_seq_action_runs';
const HISTORY_TREE_SETTINGS_HREF = getFolderTreeInstanceSettingsHref(HISTORY_TREE_INSTANCE);
const RUN_PAGE_SIZE = 100;

const resolveSelectorRegistryHref = (input: {
  selectorKey?: string | null;
  selectorProfile?: string | null;
}): string =>
  getSelectorRegistryAdminHref(
    inferSelectorRegistryNamespace({
      selectorKey: input.selectorKey,
      selectorProfile: input.selectorProfile,
    })
  );

const STATUS_OPTIONS: Array<{ value: PlaywrightActionRunStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RUN_STATUS_CLASSES: Record<PlaywrightActionRunStatus, string> = {
  queued: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  running: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  failed: 'border-red-400/30 bg-red-500/10 text-red-200',
  cancelled: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
};

const STEP_STATUS_CLASSES: Record<PlaywrightActionRunStepStatus, string> = {
  pending: 'border-slate-400/30 bg-slate-500/10 text-slate-200',
  running: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-400/30 bg-red-500/10 text-red-200',
  failed: 'border-red-400/30 bg-red-500/10 text-red-200',
  skipped: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
};

const STEP_STATUS_ORDER: PlaywrightActionRunStepStatus[] = [
  'pending',
  'running',
  'success',
  'completed',
  'error',
  'failed',
  'skipped',
];

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const formatTimestamp = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : DATE_FORMATTER.format(date);
};

const formatDuration = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unknown';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
};

const formatJsonPreview = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const normalizeDateTimeFilter = (value: string): string | undefined => {
  const normalized = value.trim();
  if (normalized === '') return undefined;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const metadataString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

function CopyValueButton({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const normalized = value?.trim();

  if (normalized === undefined || normalized === '') return null;

  return (
    <Button
      type='button'
      size='sm'
      variant='outline'
      className='h-7 gap-1.5 px-2 text-[11px]'
      onClick={() => {
        if (typeof navigator.clipboard === 'undefined') return;
        navigator.clipboard
          .writeText(normalized)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          })
          .catch(() => undefined);
      }}
    >
      <Clipboard className='size-3' />
      {copied ? 'Copied' : label}
    </Button>
  );
}

function DetailActionLink({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.JSX.Element {
  return (
    <a
      href={href}
      className='inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-[11px] font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
    >
      <ExternalLink className='size-3' />
      {label}
    </a>
  );
}

function DetailBadgeLink({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.JSX.Element {
  return (
    <a
      href={href}
      className='inline-flex items-center rounded-md border border-border/50 bg-card/40 px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
    >
      {label}
    </a>
  );
}

function StatusIcon({ status }: { status: string | null | undefined }): React.JSX.Element {
  if (status === 'completed' || status === 'success') {
    return <CheckCircle2 className='size-3.5 text-emerald-300' />;
  }
  if (status === 'failed' || status === 'error') {
    return <XCircle className='size-3.5 text-red-300' />;
  }
  if (status === 'running') {
    return <Loader2 className='size-3.5 animate-spin text-sky-300' />;
  }
  if (status === 'skipped' || status === 'cancelled') {
    return <AlertTriangle className='size-3.5 text-amber-300' />;
  }
  return <Clock3 className='size-3.5 text-muted-foreground' />;
}

function RunHistoryTreeNode(
  input: FolderTreeViewportRenderNodeInput & {
    onSelectRun: (runId: string) => void;
    onSelectStep: (runId: string, stepId: string) => void;
    firstFailedStepIdByRunId: Record<string, string | undefined>;
  }
): React.JSX.Element {
  const {
    node,
    depth,
    hasChildren,
    isExpanded,
    isSelected,
    isDragging,
    dropPosition,
    select,
    toggleExpand,
    onSelectRun,
    onSelectStep,
    firstFailedStepIdByRunId,
  } = input;
  const decoded = decodePlaywrightActionRunNodeId(node.id);
  const status = metadataString(node.metadata?.['status']);
  const stepCount = node.metadata?.['stepCount'];
  const actionId = metadataString(node.metadata?.['actionId']);
  const runtimeKey = metadataString(node.metadata?.['runtimeKey']);
  const selectorProfile = metadataString(node.metadata?.['selectorProfile']);
  const firstFailedStepId =
    decoded?.entity === 'run' ? firstFailedStepIdByRunId[decoded.id] : undefined;

  const handleSelect = (): void => {
    select();
    if (decoded?.entity === 'run') {
      onSelectRun(decoded.id);
    } else if (decoded?.entity === 'step') {
      const runId = metadataString(node.metadata?.['runId']);
      if (runId !== null) onSelectStep(runId, decoded.id);
    }
  };

  return (
    <div
      className={cn(
        'group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
        isSelected === true && 'bg-sky-600/20 text-white ring-1 ring-inset ring-sky-400/40',
        isSelected === false &&
          Boolean(dropPosition) &&
          'bg-sky-500/10 ring-1 ring-inset ring-sky-500/60',
        isSelected === false && !dropPosition && isDragging === true && 'opacity-50',
        isSelected === false &&
          !dropPosition &&
          isDragging === false &&
          'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      )}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      {hasChildren ? (
        <button
          type='button'
          className='inline-flex size-4 items-center justify-center text-muted-foreground hover:text-foreground'
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          onClick={(event) => {
            event.stopPropagation();
            toggleExpand();
          }}
        >
          {isExpanded ? <ChevronDown className='size-3' /> : <ChevronRight className='size-3' />}
        </button>
      ) : (
        <span className='inline-flex size-4 items-center justify-center'>
          {decoded?.entity === 'step' ? <FileText className='size-3' /> : <Folder className='size-3' />}
        </span>
      )}
      <button
        type='button'
        className='min-w-0 flex-1 truncate text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400'
        onClick={handleSelect}
      >
        <span className='truncate'>{node.name}</span>
      </button>
      {decoded?.entity === 'run' ? (
        <div className='flex items-center gap-1'>
          {actionId !== null ? (
            <a
              href={resolveStepSequencerActionHref(actionId)}
              aria-label={`Open ${node.name} in sequencer from tree`}
              className='inline-flex size-5 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border/50 hover:bg-card/40 hover:text-foreground'
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className='size-3' />
            </a>
          ) : null}
          {runtimeKey !== null ? (
            <a
              href={resolvePlaywrightActionRunsHref({ runtimeKey })}
              aria-label={`Filter runs by runtime key ${runtimeKey} from tree`}
              className='inline-flex size-5 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border/50 hover:bg-card/40 hover:text-foreground'
              onClick={(event) => event.stopPropagation()}
            >
              <Search className='size-3' />
            </a>
          ) : null}
          {selectorProfile !== null ? (
            <a
              href={resolvePlaywrightActionRunsHref({ selectorProfile })}
              aria-label={`Filter runs by selector profile ${selectorProfile} from tree`}
              className='inline-flex size-5 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border/50 hover:bg-card/40 hover:text-foreground'
              onClick={(event) => event.stopPropagation()}
            >
              <DatabaseIcon className='size-3' />
            </a>
          ) : null}
          {firstFailedStepId !== undefined ? (
            <button
              type='button'
              aria-label={`Open first failed step for ${node.name} from tree`}
              className='inline-flex size-5 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border/50 hover:bg-card/40 hover:text-foreground'
              onClick={(event) => {
                event.stopPropagation();
                onSelectStep(decoded.id, firstFailedStepId);
              }}
            >
              <AlertTriangle className='size-3' />
            </button>
          ) : null}
        </div>
      ) : null}
      {status !== null ? <StatusIcon status={status} /> : null}
      {decoded?.entity === 'run' && typeof stepCount === 'number' ? (
        <button
          type='button'
          aria-label={`Open ${node.name} run detail from tree`}
          className='inline-flex h-5 items-center rounded-md border border-border/50 bg-card/40 px-1.5 text-[10px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
        >
          {stepCount} steps
        </button>
      ) : null}
    </div>
  );
}

function KeyValueGrid({ values }: { values: Array<[string, string | null | undefined]> }): React.JSX.Element {
  return (
    <div className='grid gap-2 sm:grid-cols-2'>
      {values.map(([label, value]) => (
        <div key={label} className='rounded border border-border/50 bg-card/20 px-3 py-2'>
          <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
            {label}
          </div>
          <div className='mt-1 break-words text-xs text-foreground'>
            {value === null || value === undefined || value === '' ? 'None' : value}
          </div>
        </div>
      ))}
    </div>
  );
}

function RunDetail({
  run,
  steps,
  onSelectStep,
}: {
  run: PlaywrightActionRunRecord;
  steps: PlaywrightActionRunStepRecord[];
  onSelectStep: (stepId: string) => void;
}): React.JSX.Element {
  const resultPreview = formatJsonPreview(run.result);
  const actionCodeSnapshot = run.codeSnapshot ?? null;
  const stepStatusCounts = steps.reduce<Record<PlaywrightActionRunStepStatus, number>>(
    (acc, step) => {
      const nextAcc = { ...acc };
      nextAcc[step.status] += 1;
      return nextAcc;
    },
    {
      pending: 0,
      running: 0,
      success: 0,
      completed: 0,
      error: 0,
      failed: 0,
      skipped: 0,
    }
  );
  const firstFailedStep = steps.find((step) => step.status === 'error' || step.status === 'failed');
  const firstFailedStepMessage = firstFailedStep
    ? [firstFailedStep.message, firstFailedStep.warning, firstFailedStep.refId].find(
        (v) => v !== null && v !== ''
      ) ?? null
    : null;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge className={RUN_STATUS_CLASSES[run.status]}>{run.status}</Badge>
        {run.runtimeKey !== null && run.runtimeKey !== '' ? (
          <DetailBadgeLink
            href={resolvePlaywrightActionRunsHref({ runtimeKey: run.runtimeKey })}
            label={run.runtimeKey}
          />
        ) : null}
        {run.selectorProfile !== null && run.selectorProfile !== '' ? (
          <DetailBadgeLink
            href={resolvePlaywrightActionRunsHref({
              selectorProfile: run.selectorProfile,
            })}
            label={run.selectorProfile}
          />
        ) : null}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <DetailActionLink
          href={resolveStepSequencerActionHref(run.actionId)}
          label='Open action in sequencer'
        />
        <DetailActionLink
          href={resolvePlaywrightActionRunsHref({ actionId: run.actionId })}
          label='Filter action ID'
        />
        {run.runtimeKey !== null && run.runtimeKey !== '' ? (
          <DetailActionLink
            href={resolvePlaywrightActionRunsHref({ runtimeKey: run.runtimeKey })}
            label='Filter runtime key'
          />
        ) : null}
        {run.selectorProfile !== null && run.selectorProfile !== '' ? (
          <>
            <DetailActionLink
              href={resolvePlaywrightActionRunsHref({
                selectorProfile: run.selectorProfile,
              })}
              label='Filter selector profile'
            />
            <DetailActionLink
              href={resolveSelectorRegistryHref({
                selectorProfile: run.selectorProfile,
              })}
              label={
                run.selectorProfile === '1688'
                  ? 'Open 1688 selector registry'
                  : 'Open selector registry'
              }
            />
          </>
        ) : null}
        <CopyValueButton label='Copy run ID' value={run.runId} />
        <CopyValueButton label='Copy action ID' value={run.actionId} />
        <CopyValueButton label='Copy runtime key' value={run.runtimeKey} />
      </div>
      <div className='rounded border border-border/50 bg-card/20 p-3'>
        <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          Step outcome summary
        </div>
        <div className='flex flex-wrap gap-2'>
          {STEP_STATUS_ORDER.filter((stepStatus) => stepStatusCounts[stepStatus] > 0).map(
            (stepStatus) => (
              <Badge key={stepStatus} className={STEP_STATUS_CLASSES[stepStatus]}>
                {stepStatus}: {stepStatusCounts[stepStatus]}
              </Badge>
            )
          )}
          {steps.length === 0 ? (
            <span className='text-xs text-muted-foreground'>No retained step rows for this run.</span>
          ) : null}
        </div>
      </div>
      {firstFailedStep !== undefined ? (
        <div className='rounded border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='font-semibold'>First failed step: {firstFailedStep.label}</div>
              {firstFailedStepMessage !== null ? (
                <div className='mt-1 break-words text-red-100/80'>{firstFailedStepMessage}</div>
              ) : null}
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-7 border-red-300/40 bg-red-950/20 px-2 text-[11px] text-red-50 hover:bg-red-900/30'
              onClick={() => onSelectStep(firstFailedStep.id)}
            >
              Open step
            </Button>
          </div>
        </div>
      ) : null}
      {actionCodeSnapshot ? (
        <div className='space-y-3 rounded border border-border/50 bg-card/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
              <Code2 className='size-3' />
              Retained action code snapshot
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <CopyValueButton
                label='Copy semantic'
                value={actionCodeSnapshot.semanticSnippet}
              />
              <CopyValueButton
                label='Copy resolved'
                value={actionCodeSnapshot.resolvedSnippet}
              />
              {actionCodeSnapshot.unresolvedBindings.length > 0 ? (
                <Badge className='border-amber-400/30 bg-amber-500/10 text-amber-100'>
                  {actionCodeSnapshot.unresolvedBindings.length} unresolved
                </Badge>
              ) : null}
            </div>
          </div>
          <div className='grid gap-3 lg:grid-cols-2'>
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Semantic action code
              </div>
              <pre className='max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {actionCodeSnapshot.semanticSnippet}
              </pre>
            </div>
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Resolved action code
              </div>
              <pre className='max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {actionCodeSnapshot.resolvedSnippet}
              </pre>
            </div>
          </div>
          {actionCodeSnapshot.unresolvedBindings.length > 0 ? (
            <div className='rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
              <div className='mb-1 font-semibold'>Unresolved bindings</div>
              <div className='space-y-0.5'>
                {actionCodeSnapshot.unresolvedBindings.map((binding) => (
                  <div key={binding}>{binding}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <KeyValueGrid
        values={[
          ['Run ID', run.runId],
          ['Action', run.actionName],
          ['Started', formatTimestamp(run.startedAt)],
          ['Completed', formatTimestamp(run.completedAt)],
          ['Duration', formatDuration(run.durationMs)],
          ['Instance', run.instanceLabel ?? run.instanceKind],
          ['Connection', run.connectionId],
          ['Integration', run.integrationId],
        ]}
      />
      {run.error !== null && run.error !== '' ? (
        <div className='rounded border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-100'>
          {run.error}
        </div>
      ) : null}
      {run.artifacts.length > 0 ? (
        <div className='space-y-2'>
          <Label className='text-[11px] uppercase tracking-wide text-muted-foreground'>
            Artifacts
          </Label>
          <div className='space-y-2'>
            {run.artifacts.map((artifact) => (
              <div
                key={`${artifact.name}:${artifact.path}`}
                className='rounded border border-border/50 bg-card/20 px-3 py-2 text-xs'
              >
                <div className='font-medium text-foreground'>{artifact.name}</div>
                <div className='mt-1 break-all text-muted-foreground'>{artifact.path}</div>
                {(artifact.kind !== null &&
                  artifact.kind !== undefined &&
                  artifact.kind !== '') ||
                (artifact.mimeType !== null &&
                  artifact.mimeType !== undefined &&
                  artifact.mimeType !== '') ? (
                  <div className='mt-1 text-[10px] text-muted-foreground/80'>
                    {[artifact.kind, artifact.mimeType]
                      .filter(
                        (v): v is string => v !== null && v !== undefined && v !== ''
                      )
                      .join(' · ')}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {resultPreview !== '' ? (
        <div className='rounded border border-border/50 bg-black/20 p-3'>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Result payload
          </div>
          <pre className='max-h-72 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
            {resultPreview}
          </pre>
        </div>
      ) : null}
      {run.logs.length > 0 ? (
        <div className='rounded border border-border/50 bg-black/20 p-3'>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Log tail
          </div>
          <pre className='max-h-48 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
            {run.logs.slice(-20).join('\n')}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

const buildStepBreadcrumbs = (
  steps: PlaywrightActionRunStepRecord[],
  selectedStep: PlaywrightActionRunStepRecord
): PlaywrightActionRunStepRecord[] => {
  const byId = new Map(steps.map((step) => [step.id, step]));
  const breadcrumbs: PlaywrightActionRunStepRecord[] = [];
  const visited = new Set<string>();
  let current: PlaywrightActionRunStepRecord | undefined = selectedStep;

  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    breadcrumbs.unshift(current);
    current =
      current.parentStepId !== null ? byId.get(current.parentStepId) : undefined;
  }
  return breadcrumbs;
};

function StepDetail({
  step,
  steps,
  actionId,
  onSelectStep,
}: {
  step: PlaywrightActionRunStepRecord;
  steps: PlaywrightActionRunStepRecord[];
  actionId: string;
  onSelectStep: (stepId: string) => void;
}): React.JSX.Element {
  const inputPreview = formatJsonPreview(step.input);
  const outputPreview = formatJsonPreview(step.output);
  const codeSnapshot = step.codeSnapshot ?? null;
  const selectorResolution = step.selectorResolution ?? codeSnapshot?.selectorBindings ?? [];
  const breadcrumbs = useMemo(() => buildStepBreadcrumbs(steps, step), [steps, step]);
  const childSteps = useMemo(
    () =>
      steps
        .filter((candidate) => candidate.parentStepId === step.id)
        .sort((left, right) => left.sequenceIndex - right.sequenceIndex),
    [step.id, steps]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge className={STEP_STATUS_CLASSES[step.status]}>{step.status}</Badge>
        <Badge variant='neutral'>{step.kind}</Badge>
        {step.stepType !== null && step.stepType !== '' ? (
          <Badge variant='neutral'>{step.stepType}</Badge>
        ) : null}
        {codeSnapshot !== null ? (
          <Badge variant='neutral' className='gap-1'>
            <Code2 className='size-3' />
            {codeSnapshot.moduleKey}
          </Badge>
        ) : null}
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <DetailActionLink
          href={resolveStepSequencerActionHref(actionId)}
          label='Open action in sequencer'
        />
        <DetailActionLink
          href={resolveSelectorRegistryHref(step)}
          label={
            (() => {
              if (step.selectorProfile === '1688') return 'Open 1688 selector registry';
              if (step.selectorProfile === 'amazon') return 'Open Amazon selector registry';
              return 'Open selector registry';
            })()
          }
        />
        <CopyValueButton label='Copy selector' value={step.selector} />
        <CopyValueButton label='Copy selector key' value={step.selectorKey} />
        <CopyValueButton label='Copy selector profile' value={step.selectorProfile} />
        <CopyValueButton label='Copy step ref' value={step.refId} />
      </div>
      {breadcrumbs.length > 1 ? (
        <div className='rounded border border-border/50 bg-card/20 px-3 py-2'>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Step path
          </div>
          <div className='flex flex-wrap items-center gap-1.5 text-xs'>
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={breadcrumb.id} className='inline-flex items-center gap-1.5'>
                {index > 0 ? <ChevronRight className='size-3 text-muted-foreground' /> : null}
                <button
                  type='button'
                  className={cn(
                    'rounded px-1.5 py-0.5 text-left transition-colors hover:bg-muted/50',
                    breadcrumb.id === step.id
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  onClick={() => onSelectStep(breadcrumb.id)}
                >
                  {breadcrumb.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {childSteps.length > 0 ? (
        <div className='rounded border border-border/50 bg-card/20 px-3 py-2'>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Nested steps
          </div>
          <div className='space-y-1.5'>
            {childSteps.map((childStep) => (
              <button
                key={childStep.id}
                type='button'
                className='flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground'
                onClick={() => onSelectStep(childStep.id)}
              >
                <StatusIcon status={childStep.status} />
                <span className='min-w-0 flex-1 truncate'>{childStep.label}</span>
                <Badge className={STEP_STATUS_CLASSES[childStep.status]}>{childStep.status}</Badge>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {codeSnapshot ? (
        <div className='space-y-3 rounded border border-border/50 bg-card/20 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Retained Playwright code snapshot
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <CopyValueButton label='Copy semantic' value={codeSnapshot.semanticSnippet} />
              <CopyValueButton label='Copy resolved' value={codeSnapshot.resolvedSnippet} />
              {codeSnapshot.unresolvedBindings.length > 0 ? (
                <Badge className='border-amber-400/30 bg-amber-500/10 text-amber-100'>
                  {codeSnapshot.unresolvedBindings.length} unresolved
                </Badge>
              ) : null}
            </div>
          </div>
          <div className='grid gap-3 lg:grid-cols-2'>
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Semantic code
              </div>
              <pre className='max-h-52 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {codeSnapshot.semanticSnippet}
              </pre>
            </div>
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Resolved code
              </div>
              <pre className='max-h-52 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {codeSnapshot.resolvedSnippet}
              </pre>
            </div>
          </div>
          {selectorResolution.length > 0 ? (
            <div className='space-y-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Selector resolution
              </div>
              {selectorResolution.map((binding) => (
                <div
                  key={`${binding.field}:${binding.selectorKey ?? binding.resolvedSelector ?? binding.mode}`}
                  className='grid gap-2 rounded border border-border/40 bg-background/20 px-3 py-2 text-xs sm:grid-cols-[120px_140px_1fr]'
                >
                  <div className='font-medium text-foreground'>{binding.field}</div>
                  <Badge variant='neutral' className='w-fit'>
                    {binding.connected ? 'registry' : binding.mode}
                  </Badge>
                  <div className='break-words text-muted-foreground'>
                    {binding.selectorKey ?? binding.resolvedSelector ?? binding.fallbackSelector ?? 'Unresolved'}
                    {binding.selectorProfile ? ` (${binding.selectorProfile})` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {codeSnapshot.unresolvedBindings.length > 0 ? (
            <div className='rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100'>
              <div className='mb-1 font-semibold'>Unresolved bindings</div>
              <div>{codeSnapshot.unresolvedBindings.join(', ')}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      <KeyValueGrid
        values={[
          ['Step', step.label],
          ['Reference', step.refId],
          ['Selector key', step.selectorKey],
          ['Selector', step.selector],
          ['Selector profile', step.selectorProfile],
          ['Started', formatTimestamp(step.startedAt)],
          ['Completed', formatTimestamp(step.completedAt)],
          ['Duration', formatDuration(step.durationMs)],
        ]}
      />
      {step.message || step.warning ? (
        <div className='rounded border border-border/50 bg-card/20 p-3 text-xs'>
          {step.message ? <p>{step.message}</p> : null}
          {step.warning ? <p className='mt-2 text-amber-200'>{step.warning}</p> : null}
        </div>
      ) : null}
      {step.details.length > 0 ? (
        <div className='space-y-2'>
          <Label className='text-[11px] uppercase tracking-wide text-muted-foreground'>Details</Label>
          <KeyValueGrid
            values={step.details.map(
              (detail): [string, string | null | undefined] => [detail.label, detail.value]
            )}
          />
        </div>
      ) : null}
      {step.artifacts.length > 0 ? (
        <div className='space-y-2'>
          <Label className='text-[11px] uppercase tracking-wide text-muted-foreground'>
            Artifacts
          </Label>
          <div className='space-y-2'>
            {step.artifacts.map((artifact) => (
              <div
                key={`${artifact.name}:${artifact.path}`}
                className='rounded border border-border/50 bg-card/20 px-3 py-2 text-xs'
              >
                <div className='font-medium text-foreground'>{artifact.name}</div>
                <div className='mt-1 break-all text-muted-foreground'>{artifact.path}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {inputPreview || outputPreview ? (
        <div className='grid gap-3 lg:grid-cols-2'>
          {inputPreview ? (
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Input
              </div>
              <pre className='max-h-52 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {inputPreview}
              </pre>
            </div>
          ) : null}
          {outputPreview ? (
            <div className='rounded border border-border/50 bg-black/20 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Output
              </div>
              <pre className='max-h-52 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground'>
                {outputPreview}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const readInitialFilterParam = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
};

export function AdminPlaywrightActionRunsPageRuntime(): React.JSX.Element {
  const [query, setQuery] = useState(() => readInitialFilterParam('query'));
  const [status, setStatus] = useState<PlaywrightActionRunStatus | 'all'>('all');
  const [actionId, setActionId] = useState('');
  const [runtimeKey, setRuntimeKey] = useState(() => readInitialFilterParam('runtimeKey'));
  const [selectorProfile, setSelectorProfile] = useState(() => readInitialFilterParam('selectorProfile'));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const filters = useMemo(
    () => {
      const normalizedQuery = query.trim();
      const normalizedActionId = actionId.trim();
      const normalizedRuntimeKey = runtimeKey.trim();
      const normalizedSelectorProfile = selectorProfile.trim();
      const normalizedDateFrom = normalizeDateTimeFilter(dateFrom);
      const normalizedDateTo = normalizeDateTimeFilter(dateTo);
      return {
        status,
        ...(normalizedQuery ? { query: normalizedQuery } : {}),
        ...(normalizedActionId ? { actionId: normalizedActionId } : {}),
        ...(normalizedRuntimeKey ? { runtimeKey: normalizedRuntimeKey } : {}),
        ...(normalizedSelectorProfile ? { selectorProfile: normalizedSelectorProfile } : {}),
        ...(normalizedDateFrom ? { dateFrom: normalizedDateFrom } : {}),
        ...(normalizedDateTo ? { dateTo: normalizedDateTo } : {}),
        ...(cursor ? { cursor } : {}),
        limit: RUN_PAGE_SIZE,
      };
    },
    [actionId, cursor, dateFrom, dateTo, query, runtimeKey, selectorProfile, status]
  );
  const runsQuery = usePlaywrightActionRuns(filters);
  const runs = runsQuery.data?.runs ?? [];
  const nextCursor = runsQuery.data?.nextCursor ?? null;
  const detailQuery = usePlaywrightActionRun(selectedRunId, { enabled: selectedRunId !== null });
  const detail = detailQuery.data ?? null;
  const selectedStep = useMemo(
    () => detail?.steps.find((step) => step.id === selectedStepId) ?? null,
    [detail, selectedStepId]
  );
  const firstFailedStepIdByRunId = useMemo<Record<string, string | undefined>>(() => {
    if (detail === null) {
      return {};
    }

    const firstFailedStep = detail.steps.find(
      (step) => step.status === 'error' || step.status === 'failed'
    );

    return {
      [detail.run.runId]: firstFailedStep?.id,
    };
  }, [detail]);
  const hasActiveFilters =
    query.trim().length > 0 ||
    status !== 'all' ||
    actionId.trim().length > 0 ||
    runtimeKey.trim().length > 0 ||
    selectorProfile.trim().length > 0 ||
    dateFrom.trim().length > 0 ||
    dateTo.trim().length > 0;
  const currentPage = cursorStack.length + 1;

  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
    setSelectedStepId(null);
  }, [actionId, dateFrom, dateTo, query, runtimeKey, selectorProfile, status]);

  useEffect(() => {
    if (runs.length === 0) {
      if (selectedRunId !== null) setSelectedRunId(null);
      return;
    }
    if (selectedRunId !== null && runs.some((run) => run.runId === selectedRunId)) return;
    setSelectedRunId(runs[0]!.runId);
    setSelectedStepId(null);
  }, [runs, selectedRunId]);

  const masterNodes = useMemo(
    () => buildPlaywrightActionRunMasterNodes({ runs, selectedRunDetail: detail }),
    [runs, detail]
  );

  const expandedNodeIds = useMemo(
    () =>
      masterNodes
        .filter((node) => node.type === 'folder')
        .map((node) => node.id),
    [masterNodes]
  );

  const treeRevision = useMemo(() => masterNodes.map((node) => node.id).join(','), [masterNodes]);
  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async () => undefined,
      }),
    []
  );

  const {
    controller,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: HISTORY_TREE_INSTANCE,
    nodes: masterNodes,
    initiallyExpandedNodeIds: expandedNodeIds,
    externalRevision: treeRevision,
    adapter,
  });

  const handleSelectRun = useCallback((runId: string): void => {
    setSelectedRunId(runId);
    setSelectedStepId(null);
  }, []);

  const handleSelectStep = useCallback((runId: string, stepId: string): void => {
    setSelectedRunId(runId);
    setSelectedStepId(stepId);
  }, []);

  const handleNextPage = useCallback((): void => {
    if (!nextCursor) return;
    setCursorStack((stack) => [...stack, cursor]);
    setCursor(nextCursor);
    setSelectedStepId(null);
  }, [cursor, nextCursor]);

  const handlePreviousPage = useCallback((): void => {
    setCursorStack((stack) => {
      const previousCursor = stack.length > 0 ? stack[stack.length - 1] : null;
      setCursor(previousCursor ?? null);
      return stack.slice(0, -1);
    });
    setSelectedStepId(null);
  }, []);

  const handleResetFilters = useCallback((): void => {
    setQuery('');
    setStatus('all');
    setActionId('');
    setRuntimeKey('');
    setSelectorProfile('');
    setDateFrom('');
    setDateTo('');
    setCursor(null);
    setCursorStack([]);
    setSelectedStepId(null);
  }, []);

  const isLoading = runsQuery.isLoading;
  const isPagingDisabled = runsQuery.isFetching;

  return (
    <div className='space-y-4'>
      <Card className='border-border/60 bg-card/30 p-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='min-w-[240px] flex-1 space-y-1'>
            <Label htmlFor='playwright-action-run-search'>Search</Label>
            <div className='relative'>
              <Search className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                id='playwright-action-run-search'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className='pl-8'
                placeholder='Run, action, runtime key, selector profile'
              />
            </div>
          </div>
          <div className='w-[190px] space-y-1'>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as PlaywrightActionRunStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='w-[220px] space-y-1'>
            <Label htmlFor='playwright-action-run-action-id'>Action ID</Label>
            <Input
              id='playwright-action-run-action-id'
              value={actionId}
              onChange={(event) => setActionId(event.target.value)}
              placeholder='Exact action ID'
            />
          </div>
          <div className='w-[220px] space-y-1'>
            <Label htmlFor='playwright-action-run-runtime-key'>Runtime key</Label>
            <Input
              id='playwright-action-run-runtime-key'
              value={runtimeKey}
              onChange={(event) => setRuntimeKey(event.target.value)}
              placeholder='Exact runtime key'
            />
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              setRuntimeKey(SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY);
              setSelectorProfile(SUPPLIER_1688_PROBE_SCAN_SELECTOR_PROFILE);
              setCursor(null);
              setCursorStack([]);
            }}
          >
            1688 probe
          </Button>
          <div className='w-[220px] space-y-1'>
            <Label htmlFor='playwright-action-run-selector-profile'>Selector profile</Label>
            <Input
              id='playwright-action-run-selector-profile'
              value={selectorProfile}
              onChange={(event) => setSelectorProfile(event.target.value)}
              placeholder='Exact selector profile'
            />
          </div>
          <div className='w-[210px] space-y-1'>
            <Label htmlFor='playwright-action-run-date-from'>From</Label>
            <Input
              id='playwright-action-run-date-from'
              type='datetime-local'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className='w-[210px] space-y-1'>
            <Label htmlFor='playwright-action-run-date-to'>To</Label>
            <Input
              id='playwright-action-run-date-to'
              type='datetime-local'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <Button
            type='button'
            variant='ghost'
            disabled={!hasActiveFilters && cursorStack.length === 0 && cursor === null}
            onClick={handleResetFilters}
          >
            Reset
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void runsQuery.refetch();
              if (selectedRunId) void detailQuery.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]'>
        <Card className='relative min-h-[520px] border-border/60 bg-card/25 p-3'>
          <div className='mb-3 flex items-center justify-between gap-3 px-1'>
            <div>
              <h2 className='text-sm font-semibold'>Run History</h2>
              <p className='text-xs text-muted-foreground'>
                {runs.length} retained runs on page {currentPage}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={cursorStack.length === 0 || isPagingDisabled}
                onClick={handlePreviousPage}
              >
                Previous
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={!nextCursor || isPagingDisabled}
                onClick={handleNextPage}
              >
                Next
              </Button>
              <DatabaseIcon className='size-4 text-muted-foreground' />
            </div>
          </div>
          {isLoading ? (
            <div className='space-y-2'>
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} className='h-8 w-full' />
              ))}
            </div>
          ) : masterNodes.length === 0 ? (
            <div className='flex min-h-[360px] items-center justify-center rounded border border-dashed border-border/60 text-center text-sm text-muted-foreground'>
              No retained Playwright action runs found.
            </div>
          ) : (
            <div className='max-h-[640px] overflow-auto rounded border border-border/60 bg-background/20 p-1'>
              <FolderTreeViewportV2
                controller={controller}
                scrollToNodeRef={scrollToNodeRef}
                enableDnd={false}
                rootDropUi={rootDropUi}
                renderNode={(input) => (
                  <RunHistoryTreeNode
                    {...input}
                    onSelectRun={handleSelectRun}
                    onSelectStep={handleSelectStep}
                    firstFailedStepIdByRunId={firstFailedStepIdByRunId}
                  />
                )}
              />
            </div>
          )}
          <MasterTreeSettingsButton
            instance={HISTORY_TREE_INSTANCE}
            href={HISTORY_TREE_SETTINGS_HREF}
          />
        </Card>

        <Card className='min-h-[520px] border-border/60 bg-card/25 p-4'>
          {!selectedRunId ? (
            <div className='flex h-full min-h-[360px] items-center justify-center text-sm text-muted-foreground'>
              Select a run to inspect its action and step details.
            </div>
          ) : detailQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-7 w-48' />
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-40 w-full' />
            </div>
          ) : !detail ? (
            <div className='flex h-full min-h-[360px] items-center justify-center text-sm text-muted-foreground'>
              Run detail is unavailable.
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  {selectedStep ? (
                    <h2 className='text-base font-semibold'>{selectedStep.label}</h2>
                  ) : (
                    <a
                      href={resolveStepSequencerActionHref(detail.run.actionId)}
                      className='text-base font-semibold text-foreground underline-offset-4 transition-colors hover:text-accent-foreground hover:underline'
                    >
                      {detail.run.actionName}
                    </a>
                  )}
                  <p className='text-xs text-muted-foreground'>
                    {selectedStep ? 'Step detail' : 'Action run detail'}
                  </p>
                </div>
                {selectedStep ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => setSelectedStepId(null)}
                  >
                    Show run
                  </Button>
                ) : null}
              </div>
              {selectedStep ? (
                <StepDetail
                  step={selectedStep}
                  steps={detail.steps}
                  actionId={detail.run.actionId ?? ''}
                  onSelectStep={(stepId) => setSelectedStepId(stepId)}
                />
              ) : (
                <RunDetail
                  run={detail.run}
                  steps={detail.steps}
                  onSelectStep={(stepId) => setSelectedStepId(stepId)}
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
