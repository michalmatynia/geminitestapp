/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import GeometryPerimeterLesson from '@/features/kangur/ui/components/GeometryPerimeterLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (
  ui: ReactNode = <GeometryPerimeterLesson />,
  options: { locale?: string; messages?: typeof enMessages } = {}
) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

describe('GeometryPerimeterLesson i18n', () => {
  it('renders English hub labels', () => {
    renderLesson();

    expect(screen.getByRole('button', { name: /What is perimeter\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perimeter of a square/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perimeter of a rectangle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Game: Draw the perimeter/i })).toBeInTheDocument();
  });

  it('renders English intro and square copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /What is perimeter\?/i }));

    expect(screen.getByText('What is perimeter?')).toBeInTheDocument();
    expect(
      screen.getByText('Perimeter is the total length of the outline of a shape. We add all the sides.')
    ).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Perimeter of a square/i }));

    expect(screen.getByText('Each side is 3 cm')).toBeInTheDocument();
    expect(screen.getByText('Formula for a square:')).toBeInTheDocument();
    expect(screen.getByText('Example: a = 5 cm -> P = 4 × 5 = 20 cm')).toBeInTheDocument();
  });

  it('renders English rectangle and game copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Perimeter of a rectangle/i }));

    expect(screen.getByText('Sides: 6 cm, 4 cm, 6 cm, 4 cm')).toBeInTheDocument();
    expect(screen.getByText('Opposite sides are equal - add the pairs.')).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Game: Draw the perimeter/i }));

    expect(screen.getByTestId('geometry-perimeter-game-shell')).toBeInTheDocument();
    expect(
      screen.getByText('Open this lesson on screen to complete this interactive activity.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to topics/i })).toBeInTheDocument();
  });

  it('renders German hub labels and representative slide copy', () => {
    const { unmount } = renderLesson(<GeometryPerimeterLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    expect(screen.getByRole('button', { name: /Was ist Umfang\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Umfang eines Quadrats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Umfang eines Rechtecks/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zusammenfassung/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Spiel: Zeichne den Umfang/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /What is perimeter\?/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Was ist Umfang\?/i }));

    expect(screen.getByText('Was ist Umfang?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Der Umfang ist die gesamte Länge des Randes einer Figur. Wir addieren alle Seiten.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('What is perimeter?')).not.toBeInTheDocument();

    unmount();

    renderLesson(<GeometryPerimeterLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    fireEvent.click(screen.getByRole('button', { name: /Umfang eines Rechtecks/i }));

    expect(screen.getByText('Seiten: 6 cm, 4 cm, 6 cm, 4 cm')).toBeInTheDocument();
    expect(
      screen.getByText('Gegenüberliegende Seiten sind gleich - addiere die Paare.')
    ).toBeInTheDocument();
  });
});
