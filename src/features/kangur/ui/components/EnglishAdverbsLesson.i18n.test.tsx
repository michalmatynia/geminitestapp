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
import EnglishAdverbsLesson from '@/features/kangur/ui/components/EnglishAdverbsLesson';

describe('EnglishAdverbsLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the adverbs lesson shell into German and keeps the action studio wiring', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <EnglishAdverbsLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent(
      'Englisch: Adverbien'
    );

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    expect(sections.find((section) => section.id === 'game_action_studio')).toMatchObject({
      title: 'Action Studio',
      description: 'Direct animated actions with adverb cards',
    });

    const games =
      (capturedProps?.games as Array<{
        sectionId: string;
        launchableInstance?: { gameId?: string; instanceId?: string };
      }>) ?? [];

    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      sectionId: 'game_action_studio',
      launchableInstance: {
        gameId: 'english_adverbs_action_studio',
        instanceId: 'english_adverbs_action_studio:instance:default',
      },
    });
  });
});
