import { createPlaywrightConnectionTestFailWithDebug } from '@/features/playwright/server';
import { internalError } from '@/shared/errors/app-error';
import {
  TRADERA_COOKIE_ACCEPT_SELECTORS,
  TRADERA_LOGIN_SUCCESS_SELECTORS,
} from '@/features/integrations/services/tradera-listing/config';
import {
  clickWithTraderaHumanizedInput,
  fillWithTraderaHumanizedInput,
  waitForTraderaHumanizedPause,
} from '@/features/integrations/services/tradera-listing/tradera-humanized-input';

import type { Locator, Page } from 'playwright';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const TRADERA_SUCCESS_SELECTOR = TRADERA_LOGIN_SUCCESS_SELECTORS.join(', ');

export const TRADERA_ERROR_SELECTOR = [
  '[data-testid*="error"]',
  '[data-test*="error"]',
  '[role="alert"]',
  '.alert',
  '.form-error',
  '.error',
  '.text-red-500',
].join(', ');

type FailHandler = (step: string, detail: string, status?: number) => Promise<never>;
type SafeWaitForSelectorResult = Awaited<ReturnType<Page['waitForSelector']>>;
type SafeGotoResult = Awaited<ReturnType<Page['goto']>>;

export type TraderaBrowserTestUtils = {
  safeWaitForSelector: (
    selector: string,
    options: Parameters<Page['waitForSelector']>[1],
    label: string
  ) => Promise<SafeWaitForSelectorResult>;
  safeWaitFor: (
    locator: Locator,
    options: Parameters<Locator['waitFor']>[0],
    label: string
  ) => Promise<void>;
  safeCount: (locator: Locator, label: string) => Promise<number>;
  safeIsVisible: (locator: Locator, label: string) => Promise<boolean>;
  safeInnerText: (locator: Locator, label: string) => Promise<string>;
  safeGoto: (
    url: string,
    options: Parameters<Page['goto']>[1],
    label: string
  ) => Promise<SafeGotoResult>;
  safeWaitForLoadState: (
    state: Parameters<Page['waitForLoadState']>[0],
    options: Parameters<Page['waitForLoadState']>[1],
    label: string
  ) => Promise<void>;
  failWithDebug: FailHandler;
  humanizedPause: (min?: number, max?: number) => Promise<void>;
  humanizedClick: (locator: Locator) => Promise<void>;
  humanizedFill: (locator: Locator, value: string) => Promise<void>;
  acceptCookieConsent: () => Promise<boolean>;
  successSelector: string;
  errorSelector: string;
};

export const createTraderaBrowserTestUtils = (input: {
  page: Page;
  connectionId: string;
  fail: FailHandler;
  humanizeMouse: boolean;
  mouseJitter: number;
  clickDelayMin: number;
  clickDelayMax: number;
  inputDelayMin: number;
  inputDelayMax: number;
  actionDelayMin: number;
  actionDelayMax: number;
}): TraderaBrowserTestUtils => {
  const safeWaitForSelector = async (
    selector: string,
    options: Parameters<Page['waitForSelector']>[1],
    label: string
  ): Promise<SafeWaitForSelectorResult> => {
    try {
      return await input.page.waitForSelector(selector, options);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} wait failed: ${message}`);
    }
  };

  const safeWaitFor = async (
    locator: Locator,
    options: Parameters<Locator['waitFor']>[0],
    label: string
  ): Promise<void> => {
    try {
      await locator.waitFor(options);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} wait failed: ${message}`);
    }
  };

  const safeCount = async (locator: Locator, label: string): Promise<number> => {
    try {
      return await locator.count();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} count failed: ${message}`);
    }
  };

  const safeIsVisible = async (locator: Locator, label: string): Promise<boolean> => {
    try {
      return await locator.isVisible();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} visibility check failed: ${message}`);
    }
  };

  const safeInnerText = async (locator: Locator, label: string): Promise<string> => {
    try {
      return await locator.innerText();
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} text read failed: ${message}`);
    }
  };

  const safeGoto = async (
    url: string,
    options: Parameters<Page['goto']>[1],
    label: string
  ): Promise<SafeGotoResult> => {
    try {
      return await input.page.goto(url, options);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} navigation failed: ${message}`);
    }
  };

  const safeWaitForLoadState = async (
    state: Parameters<Page['waitForLoadState']>[0],
    options: Parameters<Page['waitForLoadState']>[1],
    label: string
  ): Promise<void> => {
    try {
      await input.page.waitForLoadState(state, options);
    } catch (error) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw internalError(`${label} load state failed: ${message}`);
    }
  };

  const failWithDebug = createPlaywrightConnectionTestFailWithDebug({
    page: input.page,
    connectionId: input.connectionId,
    fail: input.fail,
    onError: logClientError,
  });

  const humanizedPause = async (
    min = input.actionDelayMin,
    max = input.actionDelayMax
  ): Promise<void> => {
    await waitForTraderaHumanizedPause({
      page: input.page,
      inputBehavior: input,
      min,
      max,
    });
  };

  const humanizedClick = async (locator: Locator): Promise<void> => {
    await clickWithTraderaHumanizedInput({
      page: input.page,
      locator,
      inputBehavior: input,
    });
  };

  const humanizedFill = async (locator: Locator, value: string): Promise<void> => {
    await fillWithTraderaHumanizedInput({
      page: input.page,
      locator,
      value,
      inputBehavior: input,
    });
  };

  const acceptCookieConsent = async (): Promise<boolean> => {
    for (const selector of TRADERA_COOKIE_ACCEPT_SELECTORS) {
      const locator = input.page.locator(selector).first();
      const count = await safeCount(locator, `Cookie consent ${selector}`).catch(() => 0);
      if (count === 0) continue;
      const visible = await safeIsVisible(locator, `Cookie consent ${selector}`).catch(
        () => false
      );
      if (!visible) continue;
      try {
        await locator.scrollIntoViewIfNeeded().catch(() => undefined);
        try {
          await locator.click({ timeout: 2_000 });
        } catch {
          const clicked = await locator
            .evaluate((element) => {
              if (element instanceof HTMLElement) {
                element.click();
                return true;
              }
              return false;
            })
            .catch(() => false);
          if (!clicked) {
            await humanizedClick(locator);
          }
        }
        await input.page.waitForTimeout(600);
        return true;
      } catch (error) {
        logClientError(error);
      }
    }
    return false;
  };

  return {
    safeWaitForSelector,
    safeWaitFor,
    safeCount,
    safeIsVisible,
    safeInnerText,
    safeGoto,
    safeWaitForLoadState,
    failWithDebug,
    humanizedPause,
    humanizedClick,
    humanizedFill,
    acceptCookieConsent,
    successSelector: TRADERA_SUCCESS_SELECTOR,
    errorSelector: TRADERA_ERROR_SELECTOR,
  };
};
