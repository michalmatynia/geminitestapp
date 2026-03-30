/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl',
  },
}));

const { translationState } = vi.hoisted(() => ({
  translationState: {
    missing: false,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    () =>
    (key: string) =>
      translationState.missing ? key : key,
}));

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';

const canvasContextStub = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('GeometryDrawingGame i18n fallbacks', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    localeState.value = 'pl';
    translationState.missing = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to English shell and round copy when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;

    render(<GeometryDrawingGame onFinish={() => undefined} />);

    expect(screen.getByRole('group', { name: 'Shape difficulty level' })).toBeInTheDocument();
    expect(screen.getByText('Shapes • Starter')).toBeInTheDocument();
    expect(screen.getByText('Draw: Circle')).toBeInTheDocument();
    expect(screen.getByText('Draw one smooth, closed line.')).toBeInTheDocument();
    expect(screen.getByText('Draw here')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Drawing board for shape Circle. Use mouse or touch to draw the shape.',
      })
    ).toBeInTheDocument();
  });

  it('falls back to German shell and round copy when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;

    render(<GeometryDrawingGame onFinish={() => undefined} />);

    expect(
      screen.getByRole('group', { name: 'Schwierigkeitsstufe der Formen' })
    ).toBeInTheDocument();
    expect(screen.getByText('Formen • Starter')).toBeInTheDocument();
    expect(screen.getByText('Zeichne: Kreis')).toBeInTheDocument();
    expect(screen.getByText('Zeichne eine glatte, geschlossene Linie.')).toBeInTheDocument();
    expect(screen.getByText('Hier zeichnen')).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Zeichenfeld fur die Form Kreis. Nutze Maus oder Beruhrung, um die Form zu zeichnen.',
      })
    ).toBeInTheDocument();
  });
});
