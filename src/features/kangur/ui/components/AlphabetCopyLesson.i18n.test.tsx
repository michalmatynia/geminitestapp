/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import AlphabetCopyLesson from '@/features/kangur/ui/components/AlphabetCopyLesson';
import enMessages from '@/i18n/messages/en.json';

describe('AlphabetCopyLesson i18n', () => {
  it('renders the copy-letters lesson in English', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <AlphabetCopyLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Alphabet', level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Track: Copy the letters. Practise fluent handwriting below the model. This game is for six-year-olds.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Letter L')).toBeInTheDocument();
    expect(screen.getByText('Letter L like lion.')).toBeInTheDocument();
    expect(screen.getByText('Copy the letter on the lower lines')).toBeInTheDocument();
    expect(screen.getByText('Write here')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy the letter L below the model')).toBeInTheDocument();
    expect(screen.getByText('Stay on the lines and do not rush.')).toBeInTheDocument();
    expect(screen.getByText('0 points')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
  });
});
