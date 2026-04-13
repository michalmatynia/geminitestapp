import { createPlaywrightConnectionTestFailWithDebug } from '@/features/playwright/server';
import { internalError } from '@/shared/errors/app-error';
import {
  TRADERA_COOKIE_ACCEPT_SELECTORS,
  TRADERA_LOGIN_SUCCESS_SELECTORS,
} from '@/features/integrations/services/tradera-listing/config';

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
}) => {
  const randomBetween = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const safeWaitForSelector = async (
    selector: string,
    options: Parameters<Page['waitForSelector']>[1],
    label: string
  ) => {
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

  const safeGoto = async (url: string, options: Parameters<Page['goto']>[1], label: string) => {
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
    if (!input.humanizeMouse) return;
    const delay = randomBetween(min, max);
    if (delay > 0) {
      await input.page.waitForTimeout(delay);
    }
  };

  const humanizedClick = async (locator: Locator): Promise<void> => {
    if (!input.humanizeMouse) {
      await locator.click();
      return;
    }
    const box = await locator.boundingBox();
    if (!box) {
      await locator.click();
      return;
    }
    const offsetX = randomBetween(-input.mouseJitter, input.mouseJitter);
    const offsetY = randomBetween(-input.mouseJitter, input.mouseJitter);
    const targetX = box.x + box.width / 2 + offsetX;
    const targetY = box.y + box.height / 2 + offsetY;
    const steps = randomBetween(8, 18);
    await input.page.mouse.move(targetX, targetY, { steps });
    const delay = randomBetween(input.clickDelayMin, input.clickDelayMax);
    await input.page.mouse.click(targetX, targetY, { delay });
  };

  const humanizedFill = async (locator: Locator, value: string): Promise<void> => {
    await locator.fill(value);
    if (!input.humanizeMouse) return;
    const delay = randomBetween(input.inputDelayMin, input.inputDelayMax);
    if (delay > 0) {
      await input.page.waitForTimeout(delay);
    }
  };

  const acceptCookieConsent = async (): Promise<boolean> => {
    for (const selector of TRADERA_COOKIE_ACCEPT_SELECTORS) {
      const locator = input.page.locator(selector).first();
      const count = await safeCount(locator, `Cookie consent ${selector}`).catch(() => 0);
      if (!count) continue;
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
