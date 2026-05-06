import { Page } from 'playwright';
import { type PlaywrightVerificationInjectionConfig, PlaywrightCapturedPageObservation, PlaywrightVisionIterationCapture, PlaywrightVisionIterationEvaluation } from './types';

export async function runPlaywrightIterationEvaluation(
  options: {
    iterationsRun: number;
    maxIterations: number;
    screenshotBase64: string | null;
    dom: string | null;
    activeUrl: string;
    config: PlaywrightVerificationInjectionConfig<any>;
  }
): Promise<{ done: boolean; context: string; reasoning: string }> {
  if (typeof options.config.evaluateCapture !== 'function') {
    return { done: false, context: '', reasoning: '' };
  }

  const iterEval = await options.config.evaluateCapture({
    screenshotBase64: options.screenshotBase64,
    dom: options.dom,
    url: options.activeUrl,
    iteration: options.iterationsRun,
    maxIterations: options.maxIterations,
  });

  return {
    done: iterEval.done ?? false,
    context: iterEval.context ?? '',
    reasoning: (iterEval.reasoning ?? '').trim(),
  };
}
