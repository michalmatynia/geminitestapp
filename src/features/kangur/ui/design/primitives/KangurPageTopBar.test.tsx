/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearLatchedKangurTopBarHeightCssValue } from '../../utils/readKangurTopBarHeightCssValue';
import { KangurPageTopBar } from './KangurPageTopBar';

const TOP_BAR_HEIGHT_VAR = '--kangur-top-bar-height';

describe('KangurPageTopBar', () => {
  const resizeObservers: Array<{ callback: ResizeObserverCallback }> = [];
  const originalResizeObserver = globalThis.ResizeObserver;
  let getBoundingClientRectMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resizeObservers.length = 0;
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty(TOP_BAR_HEIGHT_VAR);

    globalThis.ResizeObserver = class ResizeObserverMock {
      callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        resizeObservers.push({ callback });
      }

      observe(): void {}

      disconnect(): void {}

      unobserve(): void {}
    } as unknown as typeof ResizeObserver;

    getBoundingClientRectMock = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function () {
      const testId = this.getAttribute('data-testid');
      if (testId === 'kangur-page-top-bar') {
        return {
          bottom: 92,
          height: 92,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top: 0,
          width: 1280,
          x: 0,
          y: 0,
        } as DOMRect;
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      } as DOMRect;
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLatchedKangurTopBarHeightCssValue();
    document.documentElement.style.removeProperty(TOP_BAR_HEIGHT_VAR);
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('writes the top-bar height CSS variable on mount', () => {
    render(<KangurPageTopBar left={<div>Navigation</div>} />);

    expect(screen.getByTestId('kangur-page-top-bar')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue(TOP_BAR_HEIGHT_VAR)).toBe('92px');
  });

  it('updates the top-bar height CSS variable when the bar resizes', () => {
    let topBarHeight = 92;
    getBoundingClientRectMock.mockImplementation(function () {
      const testId = this.getAttribute('data-testid');
      if (testId === 'kangur-page-top-bar') {
        return {
          bottom: topBarHeight,
          height: topBarHeight,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top: 0,
          width: 1280,
          x: 0,
          y: 0,
        } as DOMRect;
      }

      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON: () => ({}),
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    render(<KangurPageTopBar left={<div>Navigation</div>} />);

    topBarHeight = 108;
    resizeObservers[0]?.callback([], {} as ResizeObserver);

    expect(document.documentElement.style.getPropertyValue(TOP_BAR_HEIGHT_VAR)).toBe('108px');
  });

  it('can render at a fixed height without publishing a new top-bar CSS variable', () => {
    render(
      <KangurPageTopBar
        fixedHeightCssValue='92px'
        left={<div>Navigation</div>}
        publishHeight={false}
      />
    );

    expect(screen.getByTestId('kangur-page-top-bar')).toHaveStyle({
      height: '92px',
      minHeight: '92px',
      maxHeight: '92px',
      overflow: 'hidden',
    });
    expect(document.documentElement.style.getPropertyValue(TOP_BAR_HEIGHT_VAR)).toBe('');
    expect(resizeObservers).toHaveLength(0);
  });
});
