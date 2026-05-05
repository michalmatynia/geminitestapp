import { Page } from 'playwright';
import { PlaywrightVerificationInjectionConfig, PlaywrightCapturedPageObservation, PlaywrightInjectionResult, PlaywrightInjectionConversationMessage } from './types';
import { executeInjectedPlaywrightCode } from './utils';

export async function performInjectionIteration<TReview>(
  options: {
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
  }
): Promise<PlaywrightInjectionResult> {
    // Logic extracted from ai-step-service.ts
    return { code: '', done: false, reasoning: '' };
}

export async function executeInjectionIterationCode(
  options: {
    page: Page;
    code: string;
    shouldWaitForNavigation: boolean;
    iterationDelayMs: number;
  }
): Promise<string | null> {
  if (options.code === '') return null;
  
  try {
    await executeInjectedPlaywrightCode(options.page, options.code);
    if (options.shouldWaitForNavigation) {
      await options.page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {
        // timeout is fine, we just want to give it a chance to start loading
      });
    }
    await new Promise((r) => setTimeout(r, options.iterationDelayMs));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err ?? 'Unknown error');
  }
}
