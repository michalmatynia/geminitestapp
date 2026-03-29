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
import plMessages from '@/i18n/messages/pl.json';
import ukMessages from '@/i18n/messages/uk.json';
import EnglishComparativesSuperlativesLesson from '@/features/kangur/ui/components/EnglishComparativesSuperlativesLesson';

describe('EnglishComparativesSuperlativesLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the lesson shell into German and keeps the Compare & Crown wiring', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishComparativesSuperlativesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Komparativ und Superlativ'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    expect(sections.find((section) => section.id === 'game_compare_and_crown')).toMatchObject({
      title: 'Compare & Crown',
      description: 'Animierte Szenen mit Vergleichskarten steuern',
    });

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      sectionId: 'game_compare_and_crown',
      launchableInstance: {
        gameId: 'english_compare_and_crown',
        instanceId: 'english_compare_and_crown:instance:default',
      },
    });
  });

  it('uses the localized Polish lesson title', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <EnglishComparativesSuperlativesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Angielski: stopniowanie przymiotników'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    expect(sections.find((section) => section.id === 'form')).toMatchObject({
      title: 'Forma',
      description: 'Buduj formy stopniowania',
    });
  });

  it('uses the localized Ukrainian lesson title', () => {
    render(
      <NextIntlClientProvider locale='uk' messages={ukMessages}>
        <EnglishComparativesSuperlativesLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Англійська: вищий і найвищий ступені'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    expect(sections.find((section) => section.id === 'form')).toMatchObject({
      title: 'Форма',
      description: 'Будуй форми вищого й найвищого ступенів',
    });
  });
});
