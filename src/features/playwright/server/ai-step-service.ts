import 'server-only';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';

const EVALUATOR_DEFAULT_SYSTEM_PROMPT =
  'Evaluate the current page state and describe what you observe.';

const INJECTOR_DEFAULT_SYSTEM_PROMPT = `You are a Playwright automation expert and code generator.

You will receive a goal, context about the current page state, and optional prior evaluation results. Your job is to generate a focused Playwright TypeScript code snippet that progresses toward the goal.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences, no extra text.
2. JSON shape: { "code": string, "done": boolean, "reasoning": string }
3. "code" must be a self-contained async Playwright snippet. Available variable: page (Playwright Page).
4. "done" must be true if the goal is achieved or can be achieved by executing this code, false if more iterations will be needed.
5. "reasoning" must briefly explain what the code does and what remains if done=false.
6. Do not use require() or import statements. Do not wrap in async function declarations.
7. Keep code minimal and targeted. One clear action per iteration.
8. Read runtime['aiEvaluatorOutput'] to access the last AI Evaluator analysis.`;

export type PlaywrightStepEvaluateOptions = {
  inputSource: 'screenshot' | 'html' | 'text_content' | 'selector_text';
  data: string;
  systemPrompt?: string | null | undefined;
};

export type PlaywrightStepEvaluateResult = {
  output: string;
  modelId: string;
};

export async function evaluateStepWithAI(
  options: PlaywrightStepEvaluateOptions
): Promise<PlaywrightStepEvaluateResult> {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'playwright.ai_evaluator_step',
    {
      defaultSystemPrompt: EVALUATOR_DEFAULT_SYSTEM_PROMPT,
      defaultModelId: 'claude-sonnet-4-6',
    }
  );

  const modelId = brainConfig.modelId;
  const systemPrompt =
    options.systemPrompt?.trim() || brainConfig.systemPrompt || EVALUATOR_DEFAULT_SYSTEM_PROMPT;
  const { inputSource, data } = options;
  const isImageInput = inputSource === 'screenshot';

  if (isImageInput && !isBrainModelVisionCapable(modelId)) {
    throw new Error(
      `Model "${modelId}" does not support image inputs. Use a vision-capable model (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.0-flash) for screenshot evaluation. Configure this in /admin/brain?tab=routing under Playwright.`
    );
  }

  const userContent: unknown = isImageInput
    ? [
        { type: 'image_url' as const, image_url: { url: `data:image/png;base64,${data}` } },
        {
          type: 'text' as const,
          text: 'Evaluate the current state of the page based on this screenshot.',
        },
      ]
    : `${
        inputSource === 'html'
          ? 'Page HTML:\n'
          : inputSource === 'text_content'
            ? 'Page text content:\n'
            : 'Element text:\n'
      }${data}`;

  const result = await runBrainChatCompletion({
    modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent as string },
    ],
    temperature: brainConfig.temperature ?? 0,
  });

  return { output: result.text, modelId: result.modelId };
}

export type PlaywrightStepInjectContext = {
  iteration: number;
  maxIterations: number;
  url: string;
  dom?: string | null | undefined;
  priorEvaluation?: string | null | undefined;
  priorInjectorReasoning?: string | null | undefined;
};

export type PlaywrightStepInjectOptions = {
  goal: string;
  systemPrompt?: string | null | undefined;
  context: PlaywrightStepInjectContext;
};

export type PlaywrightStepInjectResult = {
  code: string;
  done: boolean;
  reasoning: string;
  modelId: string;
};

const buildInjectorUserMessage = (options: PlaywrightStepInjectOptions): string => {
  const { goal, context } = options;
  const lines: string[] = [
    `Goal: ${goal}`,
    `Iteration: ${context.iteration} of ${context.maxIterations}`,
    `Current URL: ${context.url}`,
  ];

  if (context.priorEvaluation) {
    lines.push(`\nPrior AI Evaluator output:\n${context.priorEvaluation}`);
  }

  if (context.priorInjectorReasoning) {
    lines.push(`\nPrior injector reasoning:\n${context.priorInjectorReasoning}`);
  }

  if (context.dom) {
    const truncated =
      context.dom.length > 8000
        ? `${context.dom.slice(0, 8000)}\n... [truncated at 8000 chars]`
        : context.dom;
    lines.push(`\nCurrent page DOM:\n${truncated}`);
  }

  lines.push(
    '\nRespond with JSON only: { "code": "...", "done": true|false, "reasoning": "..." }'
  );

  return lines.join('\n');
};

const parseInjectorResponse = (
  text: string,
  modelId: string
): PlaywrightStepInjectResult => {
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
    };
  } catch {
    return {
      code: cleaned,
      done: true,
      reasoning: 'Direct code response (JSON parse failed).',
      modelId,
    };
  }
};

export async function injectCodeWithAI(
  options: PlaywrightStepInjectOptions
): Promise<PlaywrightStepInjectResult> {
  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'playwright.ai_code_injector',
    {
      defaultSystemPrompt: INJECTOR_DEFAULT_SYSTEM_PROMPT,
      defaultModelId: 'claude-sonnet-4-6',
    }
  );

  const systemPrompt =
    options.systemPrompt?.trim() || brainConfig.systemPrompt || INJECTOR_DEFAULT_SYSTEM_PROMPT;
  const userMessage = buildInjectorUserMessage(options);

  const result = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: brainConfig.temperature ?? 0.2,
  });

  return parseInjectorResponse(result.text, result.modelId);
}
