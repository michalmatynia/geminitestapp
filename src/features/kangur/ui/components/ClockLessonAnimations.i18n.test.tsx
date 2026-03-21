/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';

import {
  ClockHourHandSweepAnimation,
  ClockMinuteByMinuteAnimation,
  ClockSecondHandAnimation,
} from './ClockLessonAnimations';

const renderClockAnimation = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('ClockLessonAnimations i18n', () => {
  it('renders English aria labels for lesson animations', () => {
    renderClockAnimation(
      <>
        <ClockHourHandSweepAnimation />
        <ClockMinuteByMinuteAnimation />
        <ClockSecondHandAnimation />
      </>
    );

    expect(
      screen.getByRole('img', { name: 'Animation: the short hand jumps from hour to hour.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Animation: the minute hand moves minute by minute.',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Animation: the second hand spins quickly.' })
    ).toBeInTheDocument();
  });
});
