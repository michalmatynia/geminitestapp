'use client';

import { useCallback, useRef, useState } from 'react';

import type { GoalAutomationEvent } from '@/app/api/filemaker/goal-automation/handler';

export type GoalAutomationIterationResult = {
  iteration: number;
  maxIterations: number;
  code: string;
  reasoning: string;
  done: boolean;
  screenshotBase64: string | null;
  url: string;
  executionError: string | null;
};

export type GoalAutomationState = {
  status: 'idle' | 'running' | 'completed' | 'error';
  iterations: GoalAutomationIterationResult[];
  evaluations: string[];
  done: boolean;
  finalUrl: string;
  error: string | null;
};

export type GoalAutomationOptions = {
  url: string;
  goal: string;
  maxIterations: number;
  evaluatorInputSource: 'screenshot' | 'html' | 'text_content' | null;
  systemPrompt: string | null;
};

const INITIAL_STATE: GoalAutomationState = {
  status: 'idle',
  iterations: [],
  evaluations: [],
  done: false,
  finalUrl: '',
  error: null,
};

function applyEvent(prev: GoalAutomationState, event: GoalAutomationEvent): GoalAutomationState {
  switch (event.type) {
    case 'started':
      return prev;
    case 'evaluation':
      return { ...prev, evaluations: [...prev.evaluations, event.output] };
    case 'iteration':
      return {
        ...prev,
        iterations: [
          ...prev.iterations,
          {
            iteration: event.iteration,
            maxIterations: event.maxIterations,
            code: event.code,
            reasoning: event.reasoning,
            done: event.done,
            screenshotBase64: event.screenshotBase64,
            url: event.url,
            executionError: event.executionError,
          },
        ],
        done: event.done || prev.done,
      };
    case 'completed':
      return { ...prev, status: 'completed', done: event.done, finalUrl: event.finalUrl };
    case 'error':
      return { ...prev, status: 'error', error: event.message };
    default:
      return prev;
  }
}

export function useFilemakerGoalAutomation(): {
  state: GoalAutomationState;
  run: (options: GoalAutomationOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<GoalAutomationState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (options: GoalAutomationOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'running', iterations: [], evaluations: [], done: false, error: null });

    try {
      const response = await fetch('/api/filemaker/goal-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
        signal: controller.signal,
      });

      if (!response.ok || response.body === null) {
        const text = await response.text().catch(() => '');
        throw new Error(`Request failed (${response.status}): ${text}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const event = JSON.parse(line) as GoalAutomationEvent;
            setState((prev) => applyEvent(prev, event));
          } catch {
            // skip malformed line
          }
        }
      }

      // Flush any trailing content
      if (buffer.trim() !== '') {
        try {
          const event = JSON.parse(buffer) as GoalAutomationEvent;
          setState((prev) => applyEvent(prev, event));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => (prev.status === 'running' ? { ...prev, status: 'idle' } : prev));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, run, cancel, reset };
}
