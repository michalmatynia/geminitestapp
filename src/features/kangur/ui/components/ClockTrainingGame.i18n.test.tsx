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
import deMessages from '@/i18n/messages/de.json';

import ClockTrainingGame from './ClockTrainingGame';

const renderGame = (
  ui: ReactNode,
  options: { locale?: string; messages?: typeof enMessages } = {}
) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      {ui}
    </NextIntlClientProvider>
  );

describe('ClockTrainingGame i18n', () => {
  it('renders English mixed-mode training chrome', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 5, minutes: 45 }]}
      />
    );

    expect(screen.getByRole('button', { name: 'Practice mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Challenge' })).toBeInTheDocument();
    expect(screen.getByText('Set the clock to the time')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent('Quarter to 6.');
    expect(screen.getByRole('button', { name: 'Check! ✅' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5-minute steps' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1-minute precision' })).toBeInTheDocument();
    expect(screen.getByText('Hours (short hand)')).toBeInTheDocument();
    expect(screen.getByText('Minutes (long hand)')).toBeInTheDocument();
    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'The hour hand moves smoothly with the minutes.'
    );
  });

  it('renders English section-specific prompt and guidance copy', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 11, minutes: 30 }]}
        section='combined'
      />
    );

    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Reading the full time'
    );
    expect(screen.getByText('Set the full time')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent('Half past 11.');
  });

  it('renders English minute-focused practice copy', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 12, minutes: 30 }]}
        section='minutes'
      />
    );

    expect(screen.getByText('Set the minutes on the clock face')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent(
      'Half an hour. The short hand stays on 12.'
    );
  });

  it('renders German mixed-mode training chrome', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 5, minutes: 45 }]}
      />,
      {
        locale: 'de',
        messages: deMessages,
      }
    );

    expect(screen.getByRole('button', { name: 'Uebungsmodus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Herausforderungsmodus' })).toBeInTheDocument();
    expect(screen.getByText('Stelle die Uhr auf die Zeit')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent('Viertel vor 6.');
    expect(screen.getByRole('button', { name: 'Pruefen! ✅' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spruenge zu 5 Min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Genau 1 Min' })).toBeInTheDocument();
    expect(screen.getByText('Stunden (kurz)')).toBeInTheDocument();
    expect(screen.getByText('Minuten (lang)')).toBeInTheDocument();
    expect(screen.getByTestId('clock-interaction-hint')).toHaveTextContent(
      'Der Stundenzeiger bewegt sich fliessend mit den Minuten.'
    );
    expect(screen.queryByText('Practice mode')).not.toBeInTheDocument();
  });

  it('renders German section-specific prompt and guidance copy', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 11, minutes: 30 }]}
        section='combined'
      />,
      {
        locale: 'de',
        messages: deMessages,
      }
    );

    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Die ganze Uhrzeit lesen'
    );
    expect(screen.getByText('Stelle die ganze Uhrzeit ein')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent('Halb 12.');
  });

  it('renders German minute-focused practice copy', () => {
    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 12, minutes: 30 }]}
        section='minutes'
      />,
      {
        locale: 'de',
        messages: deMessages,
      }
    );

    expect(screen.getByText('Stelle die Minuten auf dem Zifferblatt ein')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent(
      'Eine halbe Stunde. Der kurze Zeiger bleibt auf 12.'
    );
  });
});
