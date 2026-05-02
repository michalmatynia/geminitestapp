
import React from 'react';
import { 
  Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input
} from '@/shared/ui/primitives.public';
import { type StepDraft } from './step-form-utils';
import { 
  PLAYWRIGHT_AI_EVALUATE_INPUT_SOURCE_LABELS,
  type PlaywrightAiEvaluateInputSource,
} from '@/shared/contracts/playwright-steps';

const AI_EVALUATE_INPUT_SOURCES = Object.entries(PLAYWRIGHT_AI_EVALUATE_INPUT_SOURCE_LABELS) as [PlaywrightAiEvaluateInputSource, string][];
const AI_INJECT_LOOP_EVALUATOR_OPTIONS: [PlaywrightAiEvaluateInputSource | '', string][] = [
  ['', 'Disabled — injector only'],
  ['screenshot', 'Screenshot after each injection'],
  ['html', 'Full page HTML after each injection'],
  ['text_content', 'Page text after each injection'],
];

interface StepFormAiConfigProps {
  draft: StepDraft;
  set: <K extends keyof StepDraft>(key: K, value: StepDraft[K]) => void;
  showAiEvaluate: boolean;
  showAiInject: boolean;
}

export function StepFormAiConfig({ draft, set, showAiEvaluate, showAiInject }: StepFormAiConfigProps): React.JSX.Element | null {
  if (!showAiEvaluate && !showAiInject) return null;

  return (
    <div className='space-y-3 rounded border border-fuchsia-500/20 bg-fuchsia-500/5 p-3'>
      {showAiEvaluate && (
        <div className='space-y-1.5'>
          <Label>Input source</Label>
          <Select
            value={draft.aiInputSource ?? 'screenshot'}
            onValueChange={(v) => set('aiInputSource', v as PlaywrightAiEvaluateInputSource)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_EVALUATE_INPUT_SOURCES.map(([source, label]) => (
                <SelectItem key={source} value={source}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-xs text-muted-foreground'>
            What the AI will receive: a screenshot image, raw HTML, body text, or the text of a specific element.
          </p>
        </div>
      )}

      {showAiInject && (
        <>
          <div className='space-y-1.5'>
            <Label htmlFor='step-ai-goal'>Goal</Label>
            <Textarea
              id='step-ai-goal'
              value={draft.aiGoal ?? ''}
              onChange={(e) => set('aiGoal', e.target.value || null)}
              placeholder='Describe the objective. For example: "Click the Accept cookies button if it is present, then navigate to the checkout page."'
              rows={3}
            />
            <p className='text-xs text-muted-foreground'>
              The AI will generate and execute Playwright code each iteration to pursue this goal.
            </p>
          </div>

          <div className='space-y-1.5'>
            <Label htmlFor='step-ai-max-iterations'>Max iterations</Label>
            <Input
              id='step-ai-max-iterations'
              type='number'
              min={1}
              max={10}
              value={draft.aiMaxIterations ?? 3}
              onChange={(e) => set('aiMaxIterations', Math.min(10, Math.max(1, Number(e.target.value) || 3)))}
            />
            <p className='text-xs text-muted-foreground'>
              How many inject–execute cycles to attempt before giving up. 1–10.
            </p>
          </div>

          <div className='space-y-1.5'>
            <Label>Evaluator loop</Label>
            <Select
              value={draft.aiLoopEvaluatorInputSource ?? ''}
              onValueChange={(v) => set('aiLoopEvaluatorInputSource', v ? (v as PlaywrightAiEvaluateInputSource) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder='Disabled' />
              </SelectTrigger>
              <SelectContent>
                {AI_INJECT_LOOP_EVALUATOR_OPTIONS.map(([source, label]) => (
                  <SelectItem key={source} value={source}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              When enabled, the AI Evaluator re-assesses page state between injections, feeding its output back to the injector for the next iteration.
            </p>
          </div>

          <p className='text-xs text-muted-foreground'>
            The AI model is configured in{' '}
            <a href='/admin/brain?tab=routing' className='underline' target='_blank' rel='noreferrer'>
              AI Brain → Playwright
            </a>{' '}
            (capability: <code className='rounded bg-muted px-0.5 font-mono'>playwright.ai_code_injector</code>).
          </p>

          <div className='space-y-1.5'>
            <Label htmlFor='step-ai-inject-prompt'>System prompt override</Label>
            <Textarea
              id='step-ai-inject-prompt'
              value={draft.aiSystemPrompt ?? ''}
              onChange={(e) => set('aiSystemPrompt', e.target.value || null)}
              placeholder='Optional: override the default injector system prompt.'
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}
