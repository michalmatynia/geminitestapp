import 'server-only';

import { type Page } from 'playwright';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

import { INJECTOR_DEFAULT_SYSTEM_PROMPT } from './constants';
import {
  type PlaywrightCapturedPageObservation,
  type PlaywrightInjectionConversationMessage,
  type PlaywrightInjectionResult,
  type PlaywrightVerificationInjectionConfig,
} from './types';
import { executeInjectedPlaywrightCode } from './utils';

type InjectionIterationOptions<TReview> = {
  iterationsRun: number;
  maxIterations: number;
  activeUrl: string;
  dom: string | null;
  screenshotBase64: string | null;
  evaluatorContext: string;
  iterationFreshContext: string | null;
  priorInjectorReasoning: string | null;
  priorExecutionError: string | null;
  useHistory: boolean;
  conversationHistory: PlaywrightInjectionConversationMessage[];
  config: PlaywrightVerificationInjectionConfig<TReview>;
  review: TReview;
  capture: PlaywrightCapturedPageObservation;
};

const buildIterationUserMessage = (opts: {
  goal: string;
  iterationsRun: number;
  maxIterations: number;
  activeUrl: string;
  dom: string | null;
  evaluatorContext: string;
  iterationFreshContext: string | null;
  priorInjectorReasoning: string | null;
  priorExecutionError: string | null;
  isContinuation: boolean;
}): string => {
  const lines: string[] = opts.isContinuation
    ? [
        `Continuation — iteration ${opts.iterationsRun} of ${opts.maxIterations}`,
        `Current URL: ${opts.activeUrl}`,
      ]
    : [
        `Goal: ${opts.goal}`,
        `Iteration: ${opts.iterationsRun} of ${opts.maxIterations}`,
        `Current URL: ${opts.activeUrl}`,
      ];

  if (!opts.isContinuation && opts.evaluatorContext) {
    lines.push(`\nPrior AI Evaluator output:\n${opts.evaluatorContext}`);
  }
  if (!opts.isContinuation && opts.priorInjectorReasoning) {
    lines.push(`\nPrior injector reasoning:\n${opts.priorInjectorReasoning}`);
  }
  if (opts.iterationFreshContext) {
    lines.push(`\nCurrent page evaluation:\n${opts.iterationFreshContext}`);
  }
  if (opts.priorExecutionError) {
    lines.push(`\nPrior execution error:\n${opts.priorExecutionError}`);
  }
  if (opts.dom) {
    const truncated =
      opts.dom.length > 8000
        ? `${opts.dom.slice(0, 8000)}\n... [truncated at 8000 chars]`
        : opts.dom;
    lines.push(`\nCurrent page DOM:\n${truncated}`);
  }
  lines.push(
    '\nRespond with JSON only: { "code": "...", "done": true|false, "reasoning": "..." }'
  );
  return lines.join('\n');
};

const parseInjectionResponse = (
  text: string,
  modelId: string
): Omit<PlaywrightInjectionResult, 'userMessageText'> => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      code: typeof parsed['code'] === 'string' ? parsed['code'] : '',
      done: parsed['done'] === true,
      reasoning: typeof parsed['reasoning'] === 'string' ? parsed['reasoning'] : '',
      modelId,
      rawText: text,
    };
  } catch {
    return {
      code: cleaned,
      done: true,
      reasoning: 'Direct code response (JSON parse failed).',
      modelId,
      rawText: text,
    };
  }
};

export async function performInjectionIteration<TReview>(
  options: InjectionIterationOptions<TReview>
): Promise<PlaywrightInjectionResult> {
  const goal =
    typeof options.config.goal === 'function'
      ? options.config.goal(options.review, options.capture)
      : options.config.goal;

  const isContinuation = options.useHistory && options.iterationsRun > 1;

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    options.config.capability ?? 'playwright.ai_code_injector',
    {
      defaultSystemPrompt: INJECTOR_DEFAULT_SYSTEM_PROMPT,
      defaultTemperature: 0.2,
      ...(options.config.defaultModelId ? { defaultModelId: options.config.defaultModelId } : {}),
    }
  );

  const systemPromptOverride = (options.config.systemPrompt ?? '').trim();
  const systemPrompt =
    systemPromptOverride.length > 0 ? systemPromptOverride : brainConfig.systemPrompt;

  const userMessage = buildIterationUserMessage({
    goal,
    iterationsRun: options.iterationsRun,
    maxIterations: options.maxIterations,
    activeUrl: options.activeUrl,
    dom: options.dom,
    evaluatorContext: options.evaluatorContext,
    iterationFreshContext: options.iterationFreshContext,
    priorInjectorReasoning: options.priorInjectorReasoning,
    priorExecutionError: options.priorExecutionError,
    isContinuation,
  });

  const userContent: unknown =
    options.screenshotBase64 !== null &&
    options.screenshotBase64.length > 0 &&
    isBrainModelVisionCapable(brainConfig.modelId)
      ? [
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${options.screenshotBase64}` },
          },
          { type: 'text' as const, text: userMessage },
        ]
      : userMessage;

  const historyMessages = options.useHistory
    ? options.conversationHistory.map((m) => ({ role: m.role, content: m.content }))
    : [];

  const result = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: userContent as string },
    ],
    temperature: brainConfig.temperature ?? 0.2,
  });

  return { ...parseInjectionResponse(result.text, result.modelId), userMessageText: userMessage };
}

export async function executeInjectionIterationCode(options: {
  page: Page;
  code: string;
  shouldWaitForNavigation: boolean;
  iterationDelayMs: number;
  urlBeforeExecution?: string | null | undefined;
}): Promise<string | null> {
  if (options.code === '') return null;

  try {
    await executeInjectedPlaywrightCode(options.page, options.code);
    const urlAfter = options.page.url();
    const urlChanged =
      options.urlBeforeExecution != null && urlAfter !== options.urlBeforeExecution;
    if (options.shouldWaitForNavigation && urlChanged) {
      await options.page
        .waitForLoadState('domcontentloaded', { timeout: 5000 })
        .catch(() => undefined);
    } else {
      await options.page.waitForTimeout(options.iterationDelayMs);
    }
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err ?? 'Unknown error');
  }
}
