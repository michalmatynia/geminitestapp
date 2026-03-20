/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import AlphabetBasicsLesson from '@/features/kangur/ui/components/AlphabetBasicsLesson';
import enMessages from '@/i18n/messages/en.json';

describe('AlphabetBasicsLesson i18n', () => {
  it('renders the alphabet tracing lesson in English', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <AlphabetBasicsLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Alphabet', level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Trace the letters on the guide. Practise precise movement on colourful paths. This game is for six-year-olds.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Letter A')).toBeInTheDocument();
    expect(screen.getByText('Letter A like apple.')).toBeInTheDocument();
    expect(screen.getByText('Trace with your finger or the mouse')).toBeInTheDocument();
    expect(screen.getByLabelText('Trace the letter A')).toBeInTheDocument();
    expect(screen.getByText('Draw over the thick lines and take your time.')).toBeInTheDocument();
    expect(screen.getByText('0 points')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
  });
});
