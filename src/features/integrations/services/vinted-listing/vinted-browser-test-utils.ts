import { createPlaywrightConnectionTestFailWithDebug } from '@/features/playwright/server';
import type { Locator, Page } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  VINTED_COOKIE_ACCEPT_SELECTORS,
  VINTED_LOGIN_SUCCESS_SELECTORS,
} from './config';

export type VintedBrowserTestUtils = {
  safeWaitForSelector: (selector: string, options?: { state?: 'attached' | 'visible'; timeout?: number }, stepName?: string) => Promise<void>;
  safeWaitFor: (locator: Locator, options?: { state?: 'attached' | 'visible' | 'hidden'; timeout?: number }, stepName?: string) => Promise<void>;
  safeCount: (locator: Locator, stepName?: string) => Promise<number>;
  safeIsVisible: (locator: Locator, stepName?: string) => Promise<boolean>;
  safeInnerText: (locator: Locator, stepName?: string) => Promise<string>;
  safeGoto: (url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number }, stepName?: string) => Promise<void>;
  safeWaitForLoadState: (state?: 'load' | 'domcontentloaded' | 'networkidle', options?: { timeout?: number }, stepName?: string) => Promise<void>;
  humanizedPause: (min?: number, max?: number) => Promise<void>;
  humanizedClick: (locator: Locator) => Promise<void>;
  humanizedFill: (locator: Locator, value: string) => Promise<void>;
  acceptCookieConsent: () => Promise<void>;
  failWithDebug: (step: string, detail: string, status?: number) => Promise<never>;
  successSelector: string;
  errorSelector: string;
};

export function createVintedBrowserTestUtils(params: {
  page: Page;
  connectionId: string;
  fail: (step: string, detail: string, status?: number) => Promise<never>;
  humanizeMouse?: boolean;
  mouseJitter?: number;
  clickDelayMin?: number;
  clickDelayMax?: number;
  inputDelayMin?: number;
  inputDelayMax?: number;
  actionDelayMin?: number;
  actionDelayMax?: number;
}): VintedBrowserTestUtils {
  const { page, fail, actionDelayMin = 500, actionDelayMax = 1500 } = params;
  const successSelector = VINTED_LOGIN_SUCCESS_SELECTORS.join(', ');

  const humanizedPause = async (min = actionDelayMin, max = actionDelayMax) => {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await page.waitForTimeout(delay);
  };

  const safeGoto = async (url: string, options = {}, stepName = 'Navigation') => {
    try {
      await page.goto(url, options);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await fail(stepName, `Failed to navigate to ${url}: ${message}`);
    }
  };

  const safeWaitForSelector = async (selector: string, options = {}, stepName = 'Wait for selector') => {
    try {
      await page.waitForSelector(selector, options);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await fail(stepName, `Selector ${selector} not ready: ${message}`);
    }
  };

  const safeWaitFor = async (locator: Locator, options = {}, stepName = 'Wait for locator') => {
    try {
      await locator.waitFor(options);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await fail(stepName, `${stepName} failed: ${message}`);
    }
  };

  const safeCount = async (locator: Locator, _stepName = 'Count') => {
    return await locator.count().catch(() => 0);
  };

  const safeIsVisible = async (locator: Locator, _stepName = 'Visibility') => {
    return await locator.isVisible().catch(() => false);
  };

  const safeInnerText = async (locator: Locator, _stepName = 'Inner text') => {
    return (await locator.innerText().catch(() => '')).trim();
  };

  const safeWaitForLoadState = async (state: 'load' | 'domcontentloaded' | 'networkidle' = 'load', options = {}, stepName = 'Load state') => {
    try {
      await page.waitForLoadState(state, options);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await fail(stepName, `${stepName} (${state}) failed: ${message}`);
    }
  };

  const humanizedClick = async (locator: Locator) => {
    await locator.click();
    await humanizedPause();
  };

  const humanizedFill = async (locator: Locator, value: string) => {
    await locator.fill(value);
    await humanizedPause();
  };

  const acceptCookieConsent = async () => {
    for (const selector of VINTED_COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      if (await safeIsVisible(locator)) {
        await locator.click().catch(() => undefined);
        await page.waitForTimeout(500);
        return;
      }
    }
  };

  const failWithDebug = createPlaywrightConnectionTestFailWithDebug({
    page,
    connectionId: params.connectionId,
    fail,
    onError: (error) => {
      void ErrorSystem.captureException(error);
    },
  });

  return {
    safeWaitForSelector,
    safeWaitFor,
    safeCount,
    safeIsVisible,
    safeInnerText,
    safeGoto,
    safeWaitForLoadState,
    humanizedPause,
    humanizedClick,
    humanizedFill,
    acceptCookieConsent,
    failWithDebug,
    successSelector,
    errorSelector: '.c-form-error, .u-color-error',
  };
}
