import type { Locator, Page } from 'playwright';

export type TraderaHumanizedInputBehavior = {
  humanizeMouse: boolean;
  mouseJitter: number;
  clickDelayMin: number;
  clickDelayMax: number;
  inputDelayMin: number;
  inputDelayMax: number;
  actionDelayMin: number;
  actionDelayMax: number;
};

const toFiniteInteger = (value: number): number =>
  Number.isFinite(value) ? Math.floor(value) : 0;

const toNonNegativeInteger = (value: number): number =>
  Math.max(0, toFiniteInteger(value));

const randomBetween = (min: number, max: number): number => {
  const normalizedMin = toFiniteInteger(min);
  const normalizedMax = toFiniteInteger(max);
  const lower = Math.min(normalizedMin, normalizedMax);
  const upper = Math.max(normalizedMin, normalizedMax);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const randomDelayBetween = (min: number, max: number): number =>
  randomBetween(toNonNegativeInteger(min), toNonNegativeInteger(max));

export const waitForTraderaHumanizedPause = async ({
  page,
  inputBehavior,
  min = inputBehavior.actionDelayMin,
  max = inputBehavior.actionDelayMax,
}: {
  page: Page;
  inputBehavior: TraderaHumanizedInputBehavior;
  min?: number;
  max?: number;
}): Promise<void> => {
  if (!inputBehavior.humanizeMouse) return;
  const delay = randomDelayBetween(min, max);
  if (delay > 0) {
    await page.waitForTimeout(delay);
  }
};

export const clickWithTraderaHumanizedInput = async ({
  page,
  locator,
  inputBehavior,
}: {
  page: Page;
  locator: Locator;
  inputBehavior?: TraderaHumanizedInputBehavior | null;
}): Promise<void> => {
  if (inputBehavior?.humanizeMouse !== true) {
    await locator.click();
    return;
  }

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await locator.boundingBox().catch(() => null);
  if (box === null) {
    await locator.click();
    return;
  }

  const jitter = toNonNegativeInteger(inputBehavior.mouseJitter);
  const offsetX = randomBetween(-jitter, jitter);
  const offsetY = randomBetween(-jitter, jitter);
  const targetX = box.x + box.width / 2 + offsetX;
  const targetY = box.y + box.height / 2 + offsetY;
  const steps = randomBetween(8, 18);
  await page.mouse.move(targetX, targetY, { steps });
  await page.mouse.click(targetX, targetY, {
    delay: randomDelayBetween(inputBehavior.clickDelayMin, inputBehavior.clickDelayMax),
  });
};

export const fillWithTraderaHumanizedInput = async ({
  page,
  locator,
  value,
  inputBehavior,
}: {
  page: Page;
  locator: Locator;
  value: string;
  inputBehavior?: TraderaHumanizedInputBehavior | null;
}): Promise<void> => {
  if (inputBehavior?.humanizeMouse !== true) {
    await locator.fill(value);
    return;
  }

  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await clickWithTraderaHumanizedInput({ page, locator, inputBehavior });
  await locator.fill('');
  await locator.pressSequentially(value, {
    delay: randomDelayBetween(inputBehavior.inputDelayMin, inputBehavior.inputDelayMax),
  });

  const pauseMs = randomDelayBetween(
    inputBehavior.actionDelayMin,
    inputBehavior.actionDelayMax
  );
  if (pauseMs > 0) {
    await page.waitForTimeout(pauseMs);
  }
};
