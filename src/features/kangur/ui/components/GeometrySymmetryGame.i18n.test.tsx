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

import GeometrySymmetryGame from '@/features/kangur/ui/components/GeometrySymmetryGame';

const canvasContextStub = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  resetTransform: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('GeometrySymmetryGame i18n fallbacks', () => {
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

  it('falls back to English round and shell copy when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;

    render(<GeometrySymmetryGame onFinish={() => undefined} />);

    expect(screen.getByText('Symmetry • Axis')).toBeInTheDocument();
    expect(screen.getByText('Butterfly axis')).toBeInTheDocument();
    expect(screen.getByText('Draw the axis of symmetry of the butterfly.')).toBeInTheDocument();
    expect(
      screen.getByText('It is a vertical line through the middle. Follow the green band.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Board for drawing symmetry axes and reflections.',
      })
    ).toBeInTheDocument();
  });

  it('falls back to German round and shell copy when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;

    render(<GeometrySymmetryGame onFinish={() => undefined} />);

    expect(screen.getByText('Symmetrie • Achse')).toBeInTheDocument();
    expect(screen.getByText('Achse des Schmetterlings')).toBeInTheDocument();
    expect(
      screen.getByText('Zeichne die Symmetrieachse des Schmetterlings.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Das ist eine senkrechte Linie durch die Mitte. Folge dem grunen Band.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Zeichenfeld fur Symmetrieachsen und Spiegelungen.',
      })
    ).toBeInTheDocument();
  });
});
