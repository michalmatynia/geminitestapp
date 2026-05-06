import 'server-only';

import { z } from 'zod';

import {
  evaluateStepWithAI,
  injectCodeWithAI,
} from '@/features/playwright/server/ai-step-service';
import { launchPlaywrightBrowser } from '@/shared/lib/playwright/browser-launch';

export const filemakerGoalAutomationRequestSchema = z.object({
  url: z.string().url(),
  goal: z.string().min(1),
  maxIterations: z.number().int().min(1).max(10).default(5),
  evaluatorInputSource: z.enum(['screenshot', 'html', 'text_content']).nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
});

export type FilemakerGoalAutomationRequest = z.infer<
  typeof filemakerGoalAutomationRequestSchema
>;

export type GoalAutomationEvent =
  | { type: 'started'; url: string; goal: string }
  | {
      type: 'iteration';
      iteration: number;
      maxIterations: number;
      code: string;
      reasoning: string;
      done: boolean;
      screenshotBase64: string | null;
      url: string;
      executionError: string | null;
    }
  | { type: 'evaluation'; output: string }
  | { type: 'completed'; iterationsRun: number; done: boolean; finalUrl: string }
  | { type: 'error'; message: string };

export async function runGoalAutomationStream(
  body: FilemakerGoalAutomationRequest
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: GoalAutomationEvent): void => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      let browser: import('playwright').Browser | undefined;

      try {
        emit({ type: 'started', url: body.url, goal: body.goal });

        const { browser: launchedBrowser } = await launchPlaywrightBrowser('auto', {
          headless: true,
        });
        browser = launchedBrowser;

        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();

        await page.goto(body.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

        let aiDone = false;
        let priorReasoning: string | null = null;
        let priorEvaluation: string | null = null;
        let iterationsRun = 0;
        const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

        const maxIter = body.maxIterations;

        for (let iter = 1; iter <= maxIter && !aiDone; iter++) {
          iterationsRun = iter;

          const [dom, screenshotBuffer] = await Promise.all([
            page.content().catch(() => null),
            page.screenshot({ type: 'png' }).catch(() => null),
          ]);
          const screenshotBase64 = screenshotBuffer !== null ? screenshotBuffer.toString('base64') : null;
          const currentUrl = page.url();

          // Optional per-iteration evaluator
          if (body.evaluatorInputSource && screenshotBase64 !== null) {
            const evalData =
              body.evaluatorInputSource === 'screenshot'
                ? screenshotBase64
                : (dom ?? '');
            const evalResult = await evaluateStepWithAI({
              inputSource: body.evaluatorInputSource,
              data: evalData,
            });
            priorEvaluation = evalResult.output;
            emit({ type: 'evaluation', output: evalResult.output });
          }

          // AI code injection
          const injectResult = await injectCodeWithAI({
            goal: body.goal,
            systemPrompt: body.systemPrompt ?? null,
            context: {
              iteration: iter,
              maxIterations: maxIter,
              url: currentUrl,
              dom,
              screenshotBase64,
              priorEvaluation,
              priorInjectorReasoning: priorReasoning,
              isContinuation: iter > 1,
            },
            conversationHistory: iter > 1 ? conversationHistory : null,
          });

          aiDone = injectResult.done;
          priorReasoning = injectResult.reasoning;

          // Maintain conversation history for multi-turn continuations
          conversationHistory.push({ role: 'user', content: injectResult.userMessageText });
          conversationHistory.push({ role: 'assistant', content: injectResult.rawText });

          // Execute generated code
          let executionError: string | null = null;
          if (injectResult.code.trim() !== '') {
            try {
              const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
                ...args: string[]
              ) => (...a: unknown[]) => Promise<unknown>;
              await new AsyncFunction('page', injectResult.code)(page);
              await page
                .waitForLoadState('domcontentloaded', { timeout: 10_000 })
                .catch(() => undefined);
              await new Promise((r) => setTimeout(r, 500));
            } catch (err) {
              executionError = err instanceof Error ? err.message : String(err);
            }
          }

          // Capture post-execution screenshot
          const postScreenshotBuffer = await page.screenshot({ type: 'png' }).catch(() => null);

          emit({
            type: 'iteration',
            iteration: iter,
            maxIterations: maxIter,
            code: injectResult.code,
            reasoning: injectResult.reasoning,
            done: aiDone,
            screenshotBase64: postScreenshotBuffer !== null ? postScreenshotBuffer.toString('base64') : null,
            url: page.url(),
            executionError,
          });

          if (!aiDone && iter < maxIter) {
            await page.waitForTimeout(500);
          }
        }

        emit({
          type: 'completed',
          iterationsRun,
          done: aiDone,
          finalUrl: page.url(),
        });
      } catch (err) {
        emit({
          type: 'error',
          message: err instanceof Error ? err.message : String(err ?? 'Unknown error'),
        });
      } finally {
        await browser?.close();
        controller.close();
      }
    },
  });
}
