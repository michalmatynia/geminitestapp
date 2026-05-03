import { describe, expect, it, vi } from 'vitest';

import {
  clickWithTraderaHumanizedInput,
  fillWithTraderaHumanizedInput,
  waitForTraderaHumanizedPause,
  type TraderaHumanizedInputBehavior,
} from './tradera-humanized-input';

const buildBehavior = (
  overrides: Partial<TraderaHumanizedInputBehavior> = {}
): TraderaHumanizedInputBehavior => ({
  humanizeMouse: true,
  mouseJitter: 0,
  clickDelayMin: 7,
  clickDelayMax: 7,
  inputDelayMin: 12,
  inputDelayMax: 12,
  actionDelayMin: 22,
  actionDelayMax: 22,
  ...overrides,
});

describe('tradera humanized input helpers', () => {
  it('falls back to direct locator input when humanization is disabled', async () => {
    const page = {
      waitForTimeout: vi.fn(),
      mouse: {
        move: vi.fn(),
        click: vi.fn(),
      },
    };
    const locator = {
      fill: vi.fn(),
      click: vi.fn(),
      pressSequentially: vi.fn(),
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
      boundingBox: vi.fn(),
    };

    await fillWithTraderaHumanizedInput({
      page: page as never,
      locator: locator as never,
      value: 'user@example.com',
      inputBehavior: buildBehavior({ humanizeMouse: false }),
    });

    expect(locator.fill).toHaveBeenCalledWith('user@example.com');
    expect(locator.pressSequentially).not.toHaveBeenCalled();
    expect(page.mouse.move).not.toHaveBeenCalled();
    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });

  it('clicks and types sequentially with persona timing when humanization is enabled', async () => {
    const page = {
      waitForTimeout: vi.fn(),
      mouse: {
        move: vi.fn(),
        click: vi.fn(),
      },
    };
    const locator = {
      fill: vi.fn(),
      click: vi.fn(),
      pressSequentially: vi.fn(),
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
      boundingBox: vi.fn(async () => ({ x: 10, y: 20, width: 30, height: 40 })),
    };

    await fillWithTraderaHumanizedInput({
      page: page as never,
      locator: locator as never,
      value: '343079',
      inputBehavior: buildBehavior(),
    });

    expect(locator.scrollIntoViewIfNeeded).toHaveBeenCalled();
    expect(page.mouse.move).toHaveBeenCalledWith(25, 40, {
      steps: expect.any(Number),
    });
    expect(page.mouse.click).toHaveBeenCalledWith(25, 40, { delay: 7 });
    expect(locator.fill).toHaveBeenCalledWith('');
    expect(locator.pressSequentially).toHaveBeenCalledWith('343079', { delay: 12 });
    expect(page.waitForTimeout).toHaveBeenCalledWith(22);
  });

  it('uses a locator click fallback when a humanized click cannot resolve a bounding box', async () => {
    const page = {
      waitForTimeout: vi.fn(),
      mouse: {
        move: vi.fn(),
        click: vi.fn(),
      },
    };
    const locator = {
      click: vi.fn(),
      scrollIntoViewIfNeeded: vi.fn(async () => undefined),
      boundingBox: vi.fn(async () => null),
    };

    await clickWithTraderaHumanizedInput({
      page: page as never,
      locator: locator as never,
      inputBehavior: buildBehavior(),
    });

    expect(locator.click).toHaveBeenCalledTimes(1);
    expect(page.mouse.click).not.toHaveBeenCalled();
  });

  it('does not pause when humanization is disabled', async () => {
    const page = {
      waitForTimeout: vi.fn(),
    };

    await waitForTraderaHumanizedPause({
      page: page as never,
      inputBehavior: buildBehavior({ humanizeMouse: false }),
    });

    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });
});
