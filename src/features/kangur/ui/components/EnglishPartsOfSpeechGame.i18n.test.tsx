/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import EnglishPartsOfSpeechGame from '@/features/kangur/ui/components/EnglishPartsOfSpeechGame';

const renderGame = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <EnglishPartsOfSpeechGame onFinish={vi.fn()} />
    </NextIntlClientProvider>
  );

describe('EnglishPartsOfSpeechGame i18n', () => {
  it('renders German round chrome and word-class copy', () => {
    renderGame({ locale: 'de', messages: deMessages });

    expect(screen.getByText('Runde 1/3')).toBeInTheDocument();
    expect(screen.getByText('Ziehen und ablegen')).toBeInTheDocument();
    expect(screen.getByText('Mathe-Starterpaket')).toBeInTheDocument();
    expect(screen.getByText('Ordne die Wörter der richtigen Wortart zu.')).toBeInTheDocument();
    expect(
      screen.getByText('Nomen = Ding, Verb = Handlung, Adjektiv = Eigenschaft.')
    ).toBeInTheDocument();
    expect(screen.getByText('Wortpool')).toBeInTheDocument();
    expect(screen.getByText('Nomen')).toBeInTheDocument();
    expect(screen.getByText('Person, Ding, Begriff')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeDisabled();
    expect(screen.queryByText('Pool of words')).not.toBeInTheDocument();
    expect(screen.queryByText('Math starter pack')).not.toBeInTheDocument();
  });
});
