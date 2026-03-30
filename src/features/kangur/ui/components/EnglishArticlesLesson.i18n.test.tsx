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
import EnglishArticlesLesson from '@/features/kangur/ui/components/EnglishArticlesLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('EnglishArticlesLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the articles lesson shell into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishArticlesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Englisch: Artikel');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];

    expect(sections.find((section) => section.id === 'intro')).toMatchObject({
      title: 'Einführung',
      description: 'Warum Artikel in Aufgaben wichtig sind',
    });
    expect(sections.find((section) => section.id === 'zero')).toMatchObject({
      title: 'Nullartikel',
      description: 'Ohne Artikel',
    });
    expect(sections.find((section) => section.id === 'game_articles_drag')).toMatchObject({
      title: 'Artikel-Baukasten',
      description: 'Ziehe a, an und the in die Sätze',
    });
    expect(sections.find((section) => section.id === 'summary')).toMatchObject({
      title: 'Zusammenfassung',
      description: 'Kurzfassung der Regeln',
    });

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      sectionId: 'game_articles_drag',
      launchableInstance: {
        gameId: 'english_articles_drag_drop',
        instanceId: 'english_articles_drag_drop:instance:default',
      },
    });

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(slides.intro?.[0]?.title).toBe('Artikel im Überblick');
    render(<>{slides.intro?.[0]?.content}</>);

    expect(
      screen.getByText(
        'Artikel sind kurze Wörter vor einem Nomen. Sie zeigen, ob wir irgendein Beispiel, etwas Bestimmtes oder gar keinen Artikel meinen.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'a/an = irgendein Beispiel, the = etwas Bestimmtes, zero article = kein Artikel'
      )
    ).toBeInTheDocument();
  });
});
