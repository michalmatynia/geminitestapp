/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
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

import LogicalReasoningLesson from '@/features/kangur/ui/components/LogicalReasoningLesson';
import deMessages from '@/i18n/messages/de.json';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('LogicalReasoningLesson i18n', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('localizes the logical reasoning lesson into German', () => {
    render(
      <NextIntlClientProvider locale='de' messages={deMessages}>
        <LogicalReasoningLesson />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-unified-lesson')).toHaveTextContent('Schlussfolgern');

    const sections = (capturedProps?.sections as Array<Record<string, unknown>>) ?? [];
    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    expect(sections.find((section) => section.id === 'wnioskowanie')).toMatchObject({
      title: 'Schlussfolgern und Wenn... dann...',
      description: 'Deduktion, Induktion und logische Bedingung',
    });
    expect(sections.find((section) => section.id === 'gra')).toMatchObject({
      title: 'Spiel: Schlussfolgerung',
      description: 'Beurteile, ob die Schlussfolgerung folgt',
    });

    expect(slides.wnioskowanie?.[0]?.title).toBe('Was ist Schlussfolgern?');
    render(<>{slides.wnioskowanie?.[0]?.content}</>);

    expect(screen.getByText('Zwei Arten des Schlussfolgerns:')).toBeInTheDocument();
    expect(
      screen.getByText('Deduktion (vom Allgemeinen zum Besonderen)')
    ).toBeInTheDocument();

    render(<>{slides.gra?.[0]?.content}</>);

    expect(screen.getByText('Logikspiel')).toBeInTheDocument();
    expect(
      screen.getByText('Wenn... dann... folgt die Schlussfolgerung?')
    ).toBeInTheDocument();
    expect(screen.getByText('Folgt')).toBeInTheDocument();
    expect(screen.getByText('Folgt nicht')).toBeInTheDocument();
  });
});
