import { type Page } from 'playwright';

export const executeInjectedPlaywrightCode = async (page: Page, code: string): Promise<void> => {
  if (code.trim() === '') return;
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...a: unknown[]) => Promise<unknown>;
  await new AsyncFunction('page', code)(page);
};
