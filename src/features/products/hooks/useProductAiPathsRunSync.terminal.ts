import type { ProductAiRunFeedback } from '@/features/products/lib/product-ai-run-feedback';

import { TERMINAL_PRODUCT_AI_RUN_BADGE_TTL_MS } from './useProductAiPathsRunSync.model';

export type TerminalProductAiRunFeedbackStore = {
  statusByProductId: Map<string, ProductAiRunFeedback>;
  clearFeedback: (productId: string) => boolean;
  setFeedback: (productId: string, feedback: ProductAiRunFeedback) => void;
  dispose: () => void;
};

export const createTerminalProductAiRunFeedbackStore = (
  onFeedbackExpired: (productId: string) => void
): TerminalProductAiRunFeedbackStore => {
  const statusByProductId = new Map<string, ProductAiRunFeedback>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const clearTimer = (productId: string): void => {
    const existingTimer = timers.get(productId);
    if (existingTimer === undefined) return;
    clearTimeout(existingTimer);
    timers.delete(productId);
  };

  const clearFeedback = (productId: string): boolean => {
    clearTimer(productId);
    return statusByProductId.delete(productId);
  };

  const setFeedback = (productId: string, feedback: ProductAiRunFeedback): void => {
    statusByProductId.set(productId, feedback);
    clearTimer(productId);
    const timer = setTimeout(() => {
      timers.delete(productId);
      if (clearFeedback(productId)) {
        onFeedbackExpired(productId);
      }
    }, TERMINAL_PRODUCT_AI_RUN_BADGE_TTL_MS);
    timers.set(productId, timer);
  };

  const dispose = (): void => {
    timers.forEach((timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
    timers.clear();
    statusByProductId.clear();
  };

  return {
    statusByProductId,
    clearFeedback,
    setFeedback,
    dispose,
  };
};
