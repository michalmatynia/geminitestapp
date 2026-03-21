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
import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishSubjectVerbAgreementGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

const advanceAgreementRound = (answer: string): void => {
  fireEvent.click(screen.getByRole('button', { name: answer }));
  fireEvent.click(screen.getByTestId('english-agreement-check'));
  act(() => {
    vi.runAllTimers();
  });
};

describe('EnglishSubjectVerbAgreementGame i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders German grammar hints instead of English fallback copy', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(screen.getByText('Klicke das Verb, das zum Singular passt.')).toBeInTheDocument();
    expect(screen.getByText('Singular-Subjekt + Verb mit -s.')).toBeInTheDocument();
    expect(screen.queryByText('Singular subject + -s.')).not.toBeInTheDocument();

    advanceAgreementRound('goes');
    advanceAgreementRound('try');

    expect(screen.getByText('„Everyone“ = Singular.')).toBeInTheDocument();
    expect(screen.queryByText('Everyone = singular.')).not.toBeInTheDocument();

    advanceAgreementRound('arrives');
    advanceAgreementRound('are');

    expect(
      screen.getByText('Das nähere Subjekt ist „players“ (Plural).')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Closest subject = players (plural).')
    ).not.toBeInTheDocument();

    advanceAgreementRound('choose');

    expect(screen.getByText('„Pair“ = eine Einheit.')).toBeInTheDocument();
    expect(screen.queryByText('Pair = one set.')).not.toBeInTheDocument();
  });
});
