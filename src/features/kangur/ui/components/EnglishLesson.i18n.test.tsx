/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

import deMessages from '@/i18n/messages/de.json';
import EnglishLesson from '@/features/kangur/ui/components/EnglishLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the English basics lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Grundlagen'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];

    expect(sections.find((section) => section.id === 'greetings')).toMatchObject({
      title: 'Begrüßungen',
      description: 'Begrüßen und sich vorstellen',
    });
    expect(sections.find((section) => section.id === 'phrases')).toMatchObject({
      title: 'Sätze',
      description: 'Einfache Fragen und Antworten',
    });
    expect(sections.find((section) => section.id === 'pronoun_remix')).toMatchObject({
      title: 'Pronomen-Remix: Regeln',
      description: 'Wie man die Art eines Pronomens im Satz erkennt',
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.greetings?.[0]?.title).toBe('Hallo und tschüss');
    render(<>{slides.greetings?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Wir beginnen mit den einfachsten Wendungen, die du jeden Tag benutzen kannst.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Hallo / Guten Tag')).toBeInTheDocument();
    expect(screen.getByText('Tschüss / Auf Wiedersehen')).toBeInTheDocument();
  });
});
