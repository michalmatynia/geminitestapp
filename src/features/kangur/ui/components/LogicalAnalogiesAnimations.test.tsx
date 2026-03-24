/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import {
  AnalogyBridgeAnimation,
  CauseEffectAnimation,
  NumberOperationAnimation,
  PartWholeAnimation,
  ShapeTransformAnimation,
} from './LogicalAnalogiesAnimations';
import plMessages from '@/i18n/messages/pl.json';

describe('LogicalAnalogiesAnimations visuals', () => {
  it('renders upgraded logical analogies teaching surfaces with frames and atmosphere', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <>
          <AnalogyBridgeAnimation />
          <NumberOperationAnimation />
          <ShapeTransformAnimation />
          <PartWholeAnimation />
          <CauseEffectAnimation />
        </>
      </NextIntlClientProvider>
    );

    [
      'logical-analogies-bridge',
      'logical-analogies-number-operation',
      'logical-analogies-shape-transform',
      'logical-analogies-part-whole',
      'logical-analogies-cause-effect',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
