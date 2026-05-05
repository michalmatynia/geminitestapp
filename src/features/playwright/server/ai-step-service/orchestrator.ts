import { evaluateScreenshot } from './evaluator';
import { injectCode } from './injector';

export const aiStepOrchestrator = {
  evaluate: evaluateScreenshot,
  inject: injectCode,
};
