'use client';

import Link from 'next/link';
import React from 'react';

import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { FormSection, FormField } from '@/shared/ui/forms-and-actions.public';
import { Input } from '@/shared/ui/primitives.public';

function CapabilityRow({
  label,
  description,
  capability,
  inputSource,
}: {
  label: string;
  description: string;
  capability: 'playwright.ai_evaluator_step' | 'playwright.probe_suggestions' | 'playwright.ai_code_injector';
  inputSource: string;
}): React.JSX.Element {
  const brainOptions = useBrainModelOptions({ capability });
  const effectiveModel = brainOptions.effectiveModelId.trim() || 'Not configured in AI Brain';

  return (
    <div className='space-y-4 rounded-md border border-border/50 bg-card/30 p-4'>
      <div>
        <p className='text-sm font-medium'>{label}</p>
        <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <FormField label='Resolved Model' description='Effective model as configured in AI Brain.'>
          <Input
            value={brainOptions.isLoading ? 'Loading…' : effectiveModel}
            readOnly
            aria-label={`Resolved model for ${label}`}
          />
        </FormField>

        <FormField label='Input Source' description='What data this capability receives.'>
          <Input value={inputSource} readOnly aria-label={`Input source for ${label}`} />
        </FormField>
      </div>

      {brainOptions.sourceWarnings.length > 0 ? (
        <p className='text-xs text-amber-500'>{brainOptions.sourceWarnings[0]}</p>
      ) : null}
    </div>
  );
}

export function AdminPlaywrightAiSettingsPage(): React.JSX.Element {
  return (
    <AdminSettingsPageLayout
      title='Playwright AI'
      current='Playwright AI'
      description='AI model routing for Playwright step sequencer evaluation and live scripter probe suggestions. Models are configured in AI Brain.'
    >
      <div className='space-y-6'>
        <FormSection
          title='AI Capabilities'
          description='These capabilities are routed through AI Brain. To change the model, update the assignment in AI Brain → Playwright.'
          className='p-6'
        >
          <div className='space-y-4'>
            <CapabilityRow
              capability='playwright.ai_evaluator_step'
              label='AI Evaluator Step'
              description='Vision-capable model used by ai_evaluate steps in the Playwright step sequencer. Receives a screenshot, HTML, body text, or element text and returns a free-text evaluation.'
              inputSource='screenshot / html / text_content / selector_text'
            />

            <CapabilityRow
              capability='playwright.ai_code_injector'
              label='AI Code Injector'
              description='Chat model used by ai_inject steps to generate and execute Playwright code dynamically. Loops until a goal is achieved or max iterations are reached. Can cooperate with the AI Evaluator between iterations.'
              inputSource='page DOM + prior evaluator output + selector registry keys'
            />

            <CapabilityRow
              capability='playwright.probe_suggestions'
              label='Probe Suggestions'
              description='Chat model used by the live scripter to suggest selector improvements and next-step recommendations based on Playwright probe results.'
              inputSource='probe result text'
            />
          </div>

          <div className='mt-6 flex items-center gap-3 rounded-md border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 text-xs text-muted-foreground'>
            <span>
              Model assignments are managed in{' '}
              <Link
                href='/admin/brain?tab=routing'
                className='font-medium text-fuchsia-400 underline underline-offset-2'
              >
                AI Brain → Playwright
              </Link>
              . Changes take effect immediately without restarting the sequencer.
            </span>
          </div>
        </FormSection>

        <FormSection
          title='How It Works'
          description='Reference guide for the Playwright AI integration.'
          className='p-6'
        >
          <div className='space-y-3 text-xs text-muted-foreground'>
            <p>
              <span className='font-medium text-foreground'>AI Evaluator Step</span> — Add an{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>ai_evaluate</code> step to any
              Playwright action in the step sequencer. The step captures page state (screenshot, HTML,
              element text, or full body text) and calls the configured AI model with an optional
              system prompt. The result is available as{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>_aiResult.output</code> in
              subsequent custom script steps.
            </p>
            <p>
              <span className='font-medium text-foreground'>System Prompt Override</span> — Each{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>ai_evaluate</code> step can
              carry its own system prompt. When left empty the AI Brain-configured system prompt is
              used. Use this for step-specific evaluation goals such as "Is the checkout button
              visible? Answer YES or NO."
            </p>
            <p>
              <span className='font-medium text-foreground'>Vision Models</span> — Screenshot input
              requires a vision-capable model (e.g.{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>claude-sonnet-4-6</code>,{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>gpt-4o</code>,{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>gemini-2.0-flash</code>). The
              API returns a 422 error if the configured model does not support image inputs.
            </p>
            <p>
              <span className='font-medium text-foreground'>AI Code Injector</span> — Add an{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>ai_inject</code> step and set
              a natural-language goal. The injector calls the AI with the current page DOM, URL, prior
              evaluator output, and available selector keys. The AI responds with a Playwright code
              snippet, which is executed via{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>new Function()</code> in the
              running browser context. The loop repeats until the AI reports{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>done: true</code> or max
              iterations are reached. Results are written to{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>runtime['aiInjectorOutput']</code>{' '}
              and{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>runtime['aiInjectorDone']</code>.
            </p>
            <p>
              <span className='font-medium text-foreground'>Evaluator–Injector Cooperation Loop</span>{' '}
              — Enable the "Evaluator loop" on an{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>ai_inject</code> step to have
              the AI Evaluator re-assess page state after each code injection. The evaluator output is
              stored in{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>runtime['aiEvaluatorOutput']</code>{' '}
              and automatically included in the next injector iteration. This creates a tight
              observe→act→evaluate loop that can steer Playwright dynamically toward complex goals.
            </p>
            <p>
              <span className='font-medium text-foreground'>Probe Suggestions</span> — When the live
              scripter sends probe results to the AI, the{' '}
              <code className='rounded bg-muted px-1 py-0.5 font-mono'>playwright.probe_suggestions</code>{' '}
              capability model is used. This does not require a vision-capable model.
            </p>
          </div>
        </FormSection>
      </div>
    </AdminSettingsPageLayout>
  );
}
