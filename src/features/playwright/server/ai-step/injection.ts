import type { Page } from 'playwright';

export async function executeInjectedPlaywrightCode(page: Page, code: string): Promise<void> {
  if (code.trim() === '') return;
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...a: unknown[]) => Promise<unknown>;
  await new AsyncFunction('page', code)(page);
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
