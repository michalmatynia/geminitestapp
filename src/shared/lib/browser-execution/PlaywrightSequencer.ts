import { Page } from 'playwright';
import { StepTracker } from './step-tracker';
import { StepId } from './step-registry';
import { ActionSequenceKey } from './action-sequences';

export interface PlaywrightSequencerContext {
  page: Page;
  tracker: StepTracker;
  actionKey: ActionSequenceKey;
  emit: (type: string, payload: unknown) => void;
  artifacts?: unknown;
  log?: (message: string, context?: unknown) => void;
  helpers?: unknown;
}

export abstract class PlaywrightSequencer {
  protected context: PlaywrightSequencerContext;

  constructor(context: PlaywrightSequencerContext) {
    this.context = context;
  }

  async run(): Promise<void> {
    const steps = this.context.tracker.getSteps();
    for (const step of steps) {
      if (step.status === 'success' || step.status === 'error') continue;

      try {
        this.context.tracker.start(step.id);
        await this.executeStep(step.id as StepId);
        this.context.tracker.succeed(step.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.context.tracker.fail(step.id, message);
        throw error;
      }
    }
  }

  protected abstract executeStep(stepId: StepId): Promise<void>;

  protected async acceptCookies(selectors: string[]): Promise<void> {
    const { page } = this.context;
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        await element.click().catch(() => undefined);
        await page.waitForLoadState('networkidle').catch(() => undefined);
      }
    }
  }
}
