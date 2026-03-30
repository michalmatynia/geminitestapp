/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import { KangurLessonPrintProvider } from '@/features/kangur/ui/context/KangurLessonPrintContext';

import ClockTrainingGame from './ClockTrainingGame';

const renderGame = (
  ui: ReactNode,
  options: {
    locale?: string;
    messages?: typeof enMessages;
    onPrintPanel?: (panelId?: string) => void;
  } = {}
) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      {options.onPrintPanel ? (
        <KangurLessonPrintProvider onPrintPanel={options.onPrintPanel}>
          {ui}
        </KangurLessonPrintProvider>
      ) : (
        ui
      )}
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(screen.getByRole('button', { name: 'Practice mode' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Challenge' })).toBeInTheDocument();
    expect(within(liveUi).getByText('Set the clock to the time')).toBeInTheDocument();
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Reading the full time'
    );
    expect(within(liveUi).getByText('Set the full time')).toBeInTheDocument();
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(within(liveUi).getByText('Set the minutes on the clock face')).toBeInTheDocument();
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(screen.getByRole('button', { name: 'Uebungsmodus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Herausforderungsmodus' })).toBeInTheDocument();
    expect(within(liveUi).getByText('Stelle die Uhr auf die Zeit')).toBeInTheDocument();
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(screen.getByTestId('clock-training-guidance-title')).toHaveTextContent(
      'Die ganze Uhrzeit lesen'
    );
    expect(within(liveUi).getByText('Stelle die ganze Uhrzeit ein')).toBeInTheDocument();
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
    const liveUi = screen.getByTestId('clock-training-live-ui');

    expect(within(liveUi).getByText('Stelle die Minuten auf dem Zifferblatt ein')).toBeInTheDocument();
    expect(screen.getByTestId('clock-task-prompt')).toHaveTextContent(
      'Eine halbe Stunde. Der kurze Zeiger bleibt auf 12.'
    );
  });

  it('opts the lesson clock training shell into paged print mode and triggers panel print', () => {
    const onPrintPanel = vi.fn();

    renderGame(
      <ClockTrainingGame
        onFinish={vi.fn()}
        practiceTasks={[{ hours: 5, minutes: 0 }]}
        section='hours'
      />,
      { onPrintPanel }
    );

    expect(screen.getByTestId('clock-training-print-panel')).toHaveAttribute(
      'data-kangur-print-panel',
      'true'
    );
    expect(screen.getByTestId('clock-training-print-panel')).toHaveAttribute(
      'data-kangur-print-paged-panel',
      'true'
    );
    expect(screen.getByTestId('clock-training-print-panel')).toHaveAttribute(
      'data-kangur-print-panel-id',
      'clock-training-hours'
    );
    expect(screen.getByTestId('clock-training-print-summary')).toHaveTextContent('5:00');
    expect(screen.getByTestId('clock-training-live-ui')).toHaveAttribute(
      'data-kangur-print-exclude',
      'true'
    );

    fireEvent.click(screen.getByTestId('clock-training-print-button'));

    expect(onPrintPanel).toHaveBeenCalledTimes(1);
    expect(onPrintPanel).toHaveBeenCalledWith('clock-training-hours');
  });
});
