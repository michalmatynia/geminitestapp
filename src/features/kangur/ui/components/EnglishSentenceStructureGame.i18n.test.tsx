/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import EnglishSentenceStructureGame from '@/features/kangur/ui/components/EnglishSentenceStructureGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishSentenceStructureGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const clickCheck = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
  act(() => {
    vi.runAllTimers();
  });
};

describe('EnglishSentenceStructureGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders German instructional copy while keeping English exercise sentences', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(
      screen.getByText('Wähle den Satz in der richtigen S + V + O-Reihenfolge.')
    ).toBeInTheDocument();
    expect(screen.getByText('Welcher Satz ist richtig?')).toBeInTheDocument();
    expect(screen.getByText('Erst Subjekt, dann Verb, dann Objekt.')).toBeInTheDocument();
    expect(
      screen.queryByText('Subject first, then verb, then object.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'The drummer plays the rhythm.' }));
    clickCheck();

    clickCheck();

    fireEvent.change(screen.getByRole('textbox', { name: 'Fehlendes Wort ergänzen' }), {
      target: { value: 'do' },
    });
    clickCheck();

    fireEvent.click(screen.getByRole('button', { name: 'so' }));
    clickCheck();

    fireEvent.click(screen.getByRole('button', { name: 'often' }));
    clickCheck();

    expect(screen.getByText('She ___ like exams.')).toBeInTheDocument();
    expect(screen.getByText("Bei she gilt: does not -> doesn't.")).toBeInTheDocument();
    expect(screen.queryByText("She -> does not -> doesn't.")).not.toBeInTheDocument();
  });
});
