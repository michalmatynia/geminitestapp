'use client';

import React, { useEffect, useRef, useState } from 'react';

import { RotateCcw, Trash2 } from 'lucide-react';

import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui/primitives.public';
import { useFilemakerGoalAutomation } from '../../hooks/useFilemakerGoalAutomation';
import type { GoalAutomationIterationResult } from '../../hooks/useFilemakerGoalAutomation';
import { useGoalAutomationHistory } from '../../hooks/useGoalAutomationHistory';
import type { GoalAutomationHistoryEntry } from '../../hooks/useGoalAutomationHistory';

type ScreenshotDialogProps = {
  src: string;
  onClose: () => void;
};

function ScreenshotDialog({ src, onClose }: ScreenshotDialogProps): React.JSX.Element {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/70'
      onClick={onClose}
    >
      <div className='max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg bg-background p-2'>
        <img
          src={`data:image/png;base64,${src}`}
          alt='Page screenshot'
          className='max-h-[85vh] max-w-full rounded'
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

type IterationCardProps = {
  iter: GoalAutomationIterationResult;
  isLatest: boolean;
};

function IterationCard({ iter, isLatest }: IterationCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  return (
    <div className='rounded border border-border bg-muted/30 p-3 text-sm'>
      <div className='flex items-start gap-3'>
        {iter.screenshotBase64 !== null && (
          <button
            type='button'
            onClick={() => setPreviewSrc(iter.screenshotBase64)}
            className='shrink-0 overflow-hidden rounded border border-border transition-opacity hover:opacity-80'
          >
            <img
              src={`data:image/png;base64,${iter.screenshotBase64}`}
              alt={`Screenshot iteration ${iter.iteration}`}
              className='h-20 w-32 object-cover object-top'
            />
          </button>
        )}

        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <span className='font-medium text-muted-foreground'>
              Iteration {iter.iteration}/{iter.maxIterations}
            </span>
            {iter.done && (
              <Badge variant='default' className='bg-green-600 text-xs text-white'>
                Done
              </Badge>
            )}
            {isLatest && !iter.done && (
              <Badge variant='outline' className='text-xs'>
                Latest
              </Badge>
            )}
            {iter.executionError !== null && (
              <Badge variant='destructive' className='text-xs'>
                Error
              </Badge>
            )}
          </div>

          <p className='mb-1 text-muted-foreground'>{iter.reasoning}</p>

          {iter.url !== '' && (
            <p className='truncate text-xs text-muted-foreground/70'>URL: {iter.url}</p>
          )}

          {iter.executionError !== null && (
            <p className='mt-1 text-xs text-destructive'>Error: {iter.executionError}</p>
          )}

          {iter.code.trim() !== '' && (
            <button
              type='button'
              onClick={() => setExpanded((v) => !v)}
              className='mt-1 text-xs text-primary underline underline-offset-2'
            >
              {expanded ? 'Hide code' : 'Show generated code'}
            </button>
          )}

          {expanded && iter.code.trim() !== '' && (
            <pre className='mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-xs'>
              {iter.code}
            </pre>
          )}
        </div>
      </div>

      {previewSrc !== null && (
        <ScreenshotDialog src={previewSrc} onClose={() => setPreviewSrc(null)} />
      )}
    </div>
  );
}

type HistoryEntryCardProps = {
  entry: GoalAutomationHistoryEntry;
  onRerun: (url: string, goal: string) => void;
  onDelete: (id: string) => void;
};

function HistoryEntryCard({ entry, onRerun, onDelete }: HistoryEntryCardProps): React.JSX.Element {
  const firstScreenshot = entry.iterations.find((i) => i.screenshotBase64 !== null)?.screenshotBase64 ?? null;
  const date = new Date(entry.completedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className='flex items-start gap-3 rounded border border-border bg-muted/20 p-3 text-sm'>
      {firstScreenshot !== null && (
        <img
          src={`data:image/png;base64,${firstScreenshot}`}
          alt='Run screenshot'
          className='h-14 w-20 shrink-0 rounded border border-border object-cover object-top'
        />
      )}
      <div className='min-w-0 flex-1'>
        <div className='mb-0.5 flex items-center gap-2'>
          <span className='truncate text-xs text-muted-foreground/70'>{date}</span>
          {entry.done ? (
            <Badge variant='default' className='bg-green-600 text-xs text-white'>
              Done
            </Badge>
          ) : (
            <Badge variant='outline' className='text-xs'>
              {entry.iterationsRun} iters
            </Badge>
          )}
        </div>
        <p className='truncate text-xs font-medium text-foreground'>{entry.url}</p>
        <p className='line-clamp-2 text-xs text-muted-foreground'>{entry.goal}</p>
      </div>
      <div className='flex shrink-0 flex-col gap-1'>
        <button
          type='button'
          title='Re-run'
          onClick={() => onRerun(entry.url, entry.goal)}
          className='rounded p-1 text-muted-foreground hover:text-foreground'
        >
          <RotateCcw className='size-3.5' />
        </button>
        <button
          type='button'
          title='Delete'
          onClick={() => onDelete(entry.id)}
          className='rounded p-1 text-muted-foreground hover:text-destructive'
        >
          <Trash2 className='size-3.5' />
        </button>
      </div>
    </div>
  );
}

const GOAL_TEMPLATES: { label: string; goal: string }[] = [
  {
    label: 'Apply to job',
    goal: 'Fill in the job application form using the information provided, then submit it.',
  },
  {
    label: 'Accept cookies & continue',
    goal: 'Dismiss any cookie consent, GDPR, or privacy banners if visible, then wait for the page to settle.',
  },
  {
    label: 'Find careers page',
    goal: 'Navigate to the careers or jobs section of this website and confirm we are on the correct page.',
  },
  {
    label: 'Extract job details',
    goal: 'Extract the full job title, requirements, responsibilities, and salary information from this page.',
  },
  {
    label: 'Log in',
    goal: 'Find the login form, enter credentials if prompted, and confirm successful authentication.',
  },
];

const EVALUATOR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Disabled' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'html', label: 'Full page HTML' },
  { value: 'text_content', label: 'Page text' },
];

export type FilemakerGoalAutomationPanelProps = {
  defaultUrl?: string;
  defaultGoal?: string;
};

export function FilemakerGoalAutomationPanel({
  defaultUrl = '',
  defaultGoal = '',
}: FilemakerGoalAutomationPanelProps): React.JSX.Element {
  const [url, setUrl] = useState(defaultUrl);
  const [goal, setGoal] = useState(defaultGoal);

  // Sync when the parent updates the default URL (e.g. listing selection)
  const prevDefaultUrl = useRef(defaultUrl);
  useEffect(() => {
    if (defaultUrl !== prevDefaultUrl.current && defaultUrl.trim() !== '') {
      setUrl(defaultUrl);
      prevDefaultUrl.current = defaultUrl;
    }
  }, [defaultUrl]);
  const [maxIterations, setMaxIterations] = useState(5);
  const [evaluatorInputSource, setEvaluatorInputSource] = useState<string>('screenshot');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { state, run, cancel, reset } = useFilemakerGoalAutomation();
  const { history, addEntry, removeEntry, clearHistory } = useGoalAutomationHistory();

  // Persist completed runs to localStorage history
  const prevStatusRef = useRef(state.status);
  const currentRunRef = useRef({ url, goal });
  currentRunRef.current = { url, goal };

  useEffect(() => {
    if (prevStatusRef.current !== 'completed' && state.status === 'completed') {
      addEntry({
        url: currentRunRef.current.url,
        goal: currentRunRef.current.goal,
        iterationsRun: state.iterations.length,
        done: state.done,
        finalUrl: state.finalUrl,
        iterations: state.iterations,
      });
    }
    prevStatusRef.current = state.status;
  }, [state.status, state.iterations, state.done, state.finalUrl, addEntry]);

  const handleRun = (): void => {
    void run({
      url,
      goal,
      maxIterations,
      evaluatorInputSource:
        evaluatorInputSource === ''
          ? null
          : (evaluatorInputSource as 'screenshot' | 'html' | 'text_content'),
      systemPrompt: systemPrompt.trim() !== '' ? systemPrompt.trim() : null,
    });
  };

  const handleRerun = (rerunUrl: string, rerunGoal: string): void => {
    setUrl(rerunUrl);
    setGoal(rerunGoal);
    setShowHistory(false);
  };

  const isRunning = state.status === 'running';
  const canRun = url.trim() !== '' && goal.trim() !== '' && !isRunning;

  return (
    <div className='space-y-4'>
      <div className='space-y-3 rounded-lg border border-border p-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='goal-url'>URL</Label>
          <Input
            id='goal-url'
            type='url'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='https://example.com/apply'
            disabled={isRunning}
          />
        </div>

        <div className='space-y-1.5'>
          <div className='flex items-center justify-between gap-2'>
            <Label htmlFor='goal-text'>Goal</Label>
            <div className='flex flex-wrap gap-1'>
              {GOAL_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type='button'
                  onClick={() => setGoal(t.goal)}
                  disabled={isRunning}
                  className='rounded border border-border/60 px-1.5 py-0.5 text-xs text-muted-foreground hover:border-border hover:text-foreground disabled:opacity-40'
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            id='goal-text'
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='Describe what you want the AI to do. For example: "Click the Apply button and fill in my name and email."'
            rows={3}
            disabled={isRunning}
          />
        </div>

        <div className='flex flex-wrap items-end gap-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='goal-max-iter'>Max iterations</Label>
            <Input
              id='goal-max-iter'
              type='number'
              min={1}
              max={10}
              value={maxIterations}
              onChange={(e) =>
                setMaxIterations(Math.min(10, Math.max(1, Number(e.target.value) || 5)))
              }
              className='w-24'
              disabled={isRunning}
            />
          </div>

          <div className='space-y-1.5'>
            <Label>Evaluator</Label>
            <Select
              value={evaluatorInputSource}
              onValueChange={setEvaluatorInputSource}
              disabled={isRunning}
            >
              <SelectTrigger className='w-44'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type='button'
            onClick={() => setShowAdvanced((v) => !v)}
            className='text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50'
            disabled={isRunning}
          >
            {showAdvanced ? 'Hide advanced' : 'Advanced'}
          </button>
        </div>

        {showAdvanced && (
          <div className='space-y-1.5'>
            <Label htmlFor='goal-system-prompt'>System prompt override</Label>
            <Textarea
              id='goal-system-prompt'
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder='Optional: override the default AI injector system prompt.'
              rows={3}
              disabled={isRunning}
            />
          </div>
        )}

        <div className='flex gap-2'>
          <Button onClick={handleRun} disabled={!canRun} size='sm'>
            {isRunning ? 'Running…' : 'Run'}
          </Button>
          {isRunning && (
            <Button variant='outline' size='sm' onClick={cancel}>
              Cancel
            </Button>
          )}
          {(state.status === 'completed' || state.status === 'error') && (
            <Button variant='ghost' size='sm' onClick={reset}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {state.error !== null && (
        <div className='rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {state.error}
        </div>
      )}

      {state.status === 'completed' && (
        <div className='rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400'>
          {state.done
            ? `Goal achieved in ${state.iterations.length} iteration${state.iterations.length !== 1 ? 's' : ''}.`
            : `Reached max iterations (${state.iterations.length}) without confirming goal completion.`}
        </div>
      )}

      {state.iterations.length > 0 && (
        <div className='space-y-2'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            Iterations
          </p>
          {state.iterations.map((iter, idx) => (
            <IterationCard
              key={iter.iteration}
              iter={iter}
              isLatest={idx === state.iterations.length - 1 && isRunning}
            />
          ))}
        </div>
      )}

      {isRunning && state.iterations.length === 0 && (
        <p className='text-sm text-muted-foreground'>Starting automation…</p>
      )}

      {history.length > 0 && (
        <div className='rounded-lg border border-border'>
          <button
            type='button'
            onClick={() => setShowHistory((v) => !v)}
            className='flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground'
          >
            <span>History ({history.length})</span>
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  clearHistory();
                }}
                className='text-xs text-muted-foreground/60 underline underline-offset-2 hover:text-destructive'
              >
                Clear all
              </button>
              <span className='text-xs'>{showHistory ? '▲' : '▼'}</span>
            </div>
          </button>

          {showHistory && (
            <div className='space-y-2 border-t border-border px-3 pb-3 pt-2'>
              {history.map((entry) => (
                <HistoryEntryCard
                  key={entry.id}
                  entry={entry}
                  onRerun={handleRerun}
                  onDelete={removeEntry}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
