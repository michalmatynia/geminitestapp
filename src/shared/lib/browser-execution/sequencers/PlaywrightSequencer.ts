import { type Page } from 'playwright';
import { type StepTracker } from '../step-tracker';
import { type StepId } from '../step-registry';
import { type ActionSequenceKey } from '../action-sequences';

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

  protected async withRetry<T>(
    operation: () => Promise<T>,
    { retries = 3, delay = 1000, context = 'operation' }: { retries?: number; delay?: number; context?: string } = {}
  ): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        this.context.log?.(`Retrying ${context} (${attempt + 1}/${retries})`, { error: String(error) });
        if (attempt === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }

  protected abstract executeStep(stepId: StepId): Promise<void>;

  protected async acceptCookies(selectors: readonly string[]): Promise<void> {
    const { page } = this.context;
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 })) {
        await element.click().catch(() => undefined);
        await page.waitForLoadState('networkidle').catch(() => undefined);
      }
    }
  }

  protected async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async clickIfVisible(selector: string, timeout = 2000): Promise<boolean> {
    const { page } = this.context;
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ timeout });
      await locator.click();
      return true;
    } catch {
      return false;
    }
  }

  protected async safeFill(selector: string, value: string, timeout = 2000): Promise<void> {
    const { page } = this.context;
    const locator = page.locator(selector).first();
    await locator.waitFor({ timeout });
    await locator.fill(value);
  }

  protected async interact(selector: string, action: 'click' | 'fill', value?: string): Promise<void> {
    const { page } = this.context;
    await this.withRetry(async () => {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      if (action === 'click') {
        await locator.click();
      } else if (action === 'fill' && value !== undefined) {
        await locator.fill(value);
      }
    }, { context: `interact:${action}:${selector}` });
  }

  protected async captureArtifacts(key: string): Promise<void> {
    const artifacts = this.context.artifacts as Record<string, unknown> | undefined;
    if (!artifacts) return;
    if (typeof artifacts['screenshot'] === 'function') {
      await (artifacts['screenshot'] as (k: string) => Promise<unknown>)(key).catch(() => undefined);
    }
    if (typeof artifacts['html'] === 'function') {
      await (artifacts['html'] as (k: string) => Promise<unknown>)(key).catch(() => undefined);
    }
  }

  protected async selectOptionByText(selector: string, text: string): Promise<void> {
    const { page } = this.context;
    const locator = page.locator(selector).first();
    await locator.waitFor({ timeout: 2000 });
    await locator.selectOption({ label: text });
  }

  protected async checkElementExists(selector: string, timeout = 2000): Promise<boolean> {
    const { page } = this.context;
    const locator = page.locator(selector).first();
    try {
      await locator.waitFor({ state: 'attached', timeout });
      return true;
    } catch {
      return false;
    }
  }

  protected async waitForNavigation(urlPart: string, timeout = 10000): Promise<void> {
    const { page } = this.context;
    await page.waitForURL((url) => url.toString().includes(urlPart), { timeout });
  }
}
