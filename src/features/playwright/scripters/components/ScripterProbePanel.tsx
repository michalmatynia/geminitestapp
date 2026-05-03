'use client';

import { Crosshair, Loader2, RotateCw } from 'lucide-react';
import { type JSX, useCallback, useEffect, useRef, useState } from 'react';

import { Alert, Badge, Button, Card, Input, Label } from '@/shared/ui/primitives.public';

import { computeSelectorForElement } from '../iframe-selector';
import type { ProbeEvaluateResult, ProbeStartResult } from '../probe-service';

export type ScripterProbePanelProps = {
  initialUrl?: string;
  onSelectorChosen: (selector: string) => void;
};

type ProbeState = ProbeStartResult | null;

const probeStart = async (url: string): Promise<ProbeStartResult> => {
  const res = await fetch('/api/playwright/scripters/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Probe failed (${res.status})`);
  return (await res.json()) as ProbeStartResult;
};

const probeEvaluate = async (
  sessionId: string,
  selector: string
): Promise<ProbeEvaluateResult> => {
  const res = await fetch(`/api/playwright/scripters/probe/${sessionId}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selector }),
  });
  if (!res.ok) throw new Error(`Evaluate failed (${res.status})`);
  return (await res.json()) as ProbeEvaluateResult;
};

const probeClose = async (sessionId: string): Promise<void> => {
  await fetch(`/api/playwright/scripters/probe/${sessionId}/close`, { method: 'POST' });
};

export function ScripterProbePanel({
  initialUrl = '',
  onSelectorChosen,
}: ScripterProbePanelProps): JSX.Element {
  const [url, setUrl] = useState(initialUrl);
  const [session, setSession] = useState<ProbeState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selector, setSelector] = useState('');
  const [evaluation, setEvaluation] = useState<ProbeEvaluateResult | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    return () => {
      if (session) void probeClose(session.sessionId);
    };
  }, [session]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !session) return;
    const handleLoad = (): void => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const handleClick = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.target as Element | null;
        if (!target) return;
        const computed = computeSelectorForElement(target);
        setSelector(computed);
      };
      doc.addEventListener('click', handleClick, true);
      doc.body?.style.setProperty('cursor', 'crosshair');
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [session]);

  const startProbe = useCallback(async () => {
    setBusy(true);
    setError(null);
    setEvaluation(null);
    try {
      if (session) await probeClose(session.sessionId);
      const result = await probeStart(url);
      setSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [session, url]);

  const evaluateSelector = useCallback(async () => {
    if (!session || !selector.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await probeEvaluate(session.sessionId, selector);
      setEvaluation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [session, selector]);

  return (
    <Card className='space-y-3 p-3'>
      <div className='flex flex-wrap items-end gap-2'>
        <div className='flex-1 min-w-[280px] space-y-1'>
          <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
            Probe URL
          </Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder='https://shop.example/products'
            className='font-mono text-sm'
          />
        </div>
        <Button type='button' size='sm' onClick={startProbe} disabled={busy || !url}>
          {busy ? <Loader2 className='mr-2 size-4 animate-spin' /> : <RotateCw className='mr-2 size-4' />}
          {session ? 'Reload probe' : 'Start probe'}
        </Button>
      </div>

      {error ? <Alert variant='destructive'>{error}</Alert> : null}

      {session ? (
        <>
          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
            <Badge variant='outline'>session {session.sessionId.slice(0, 8)}</Badge>
            <span>{session.title || session.finalUrl}</span>
          </div>
          <div className='h-[420px] overflow-hidden rounded border border-border/40'>
            <iframe
              ref={iframeRef}
              title='Scripter probe sandbox'
              sandbox='allow-same-origin'
              srcDoc={session.sanitizedHtml}
              className='h-full w-full bg-white'
            />
          </div>
          <div className='flex flex-wrap items-end gap-2'>
            <div className='flex-1 min-w-[260px] space-y-1'>
              <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
                Selector
              </Label>
              <div className='flex items-center gap-2'>
                <Crosshair className='size-4 text-muted-foreground' />
                <Input
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  placeholder='Click an element above or type a selector'
                  className='font-mono text-sm'
                />
              </div>
            </div>
            <Button type='button' size='sm' variant='outline' onClick={evaluateSelector} disabled={busy || !selector}>
              Try
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={() => onSelectorChosen(selector)}
              disabled={!selector}
            >
              Use selector
            </Button>
          </div>
          {evaluation ? (
            <div className='space-y-2 rounded border border-border/40 p-2'>
              <div className='flex items-center gap-2 text-sm'>
                <Badge variant={evaluation.matchCount === 0 ? 'destructive' : 'secondary'}>
                  {evaluation.matchCount} matches
                </Badge>
                <code className='text-xs'>{evaluation.selector}</code>
              </div>
              {evaluation.candidates.length > 0 ? (
                <div className='space-y-1'>
                  <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
                    Suggested candidates
                  </Label>
                  <div className='flex flex-wrap gap-1'>
                    {evaluation.candidates.map((candidate) => (
                      <Button
                        key={candidate.selector}
                        type='button'
                        size='sm'
                        variant='outline'
                        title={`${candidate.rationale} (${candidate.stability})`}
                        onClick={() => setSelector(candidate.selector)}
                      >
                        <code className='text-xs'>{candidate.selector}</code>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {evaluation.preview.length > 0 ? (
                <div className='space-y-1'>
                  <Label className='text-xs uppercase tracking-wide text-muted-foreground'>
                    Sample matches
                  </Label>
                  <ul className='space-y-1 text-xs'>
                    {evaluation.preview.map((item, idx) => (
                      <li key={idx} className='rounded bg-muted/40 p-1 font-mono'>
                        {item.textSnippet || item.outerHtmlSnippet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
