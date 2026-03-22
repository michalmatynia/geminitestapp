/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

let capturedProps: Record<string, unknown> | null = null;

vi.mock('@/features/kangur/ui/lessons/lesson-components', () => ({
  KangurUnifiedLesson: (props: Record<string, unknown>) => {
    capturedProps = props;
    return <div data-testid='kangur-unified-lesson'>{String(props.lessonTitle ?? '')}</div>;
  },
}));

vi.mock('@/features/kangur/ui/components/GeometryDrawingGame', () => ({
  default: () => <div data-testid='geometry-drawing-game' />,
}));

import plMessages from '@/i18n/messages/pl.json';
import GeometryShapeRecognitionLesson from '@/features/kangur/ui/components/GeometryShapeRecognitionLesson';

type CapturedSlide = {
  title: string;
  content: React.ReactNode;
};

describe('GeometryShapeRecognitionLesson touch mode', () => {
  afterEach(() => {
    capturedProps = null;
  });

  it('uses larger touch-friendly answer buttons in the practice slide', () => {
    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <GeometryShapeRecognitionLesson />
      </NextIntlClientProvider>
    );

    const slides = (capturedProps?.slides as Record<string, CapturedSlide[]>) ?? {};

    render(<>{slides.practice?.[0]?.content}</>);

    expect(screen.getByRole('button', { name: 'Koło' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-[4rem]'
    );
  });
});
