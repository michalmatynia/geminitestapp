/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

vi.mock('@/features/kangur/ui/components/AddingBallGame', () => ({
  default: () => <div>Mock Adding Ball Game</div>,
}));

vi.mock('@/features/kangur/ui/components/AddingSynthesisGame', () => ({
  default: () => <div>Mock Adding Synthesis Game</div>,
}));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import AddingLesson from '@/features/kangur/ui/components/AddingLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (
  ui: ReactNode = <AddingLesson />,
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

describe('AddingLesson i18n', () => {
  it('renders English hub labels', () => {
    renderLesson();

    expect(screen.getByRole('button', { name: /Addition basics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adding past 10/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Two-digit addition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remember!/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Addition synthesis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ball game/i })).toBeInTheDocument();
  });

  it('renders English basics and adding-past-10 slide copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Addition basics/i }));

    expect(screen.getByText('What does it mean to add?')).toBeInTheDocument();
    expect(screen.getByText('Part + part makes a whole.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Addition in motion/i })).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Adding past 10/i }));

    expect(screen.getByText('Adding across 10')).toBeInTheDocument();
    expect(
      screen.getByText('When the sum goes past 10, you can make 10 first and then add the rest.')
    ).toBeInTheDocument();
    expect(screen.getByText('+2 left')).toBeInTheDocument();
  });

  it('renders English two-digit and remember slide copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Two-digit addition/i }));

    expect(screen.getByText('Add tens and ones separately!')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Tens and ones blocks/i })).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Remember!/i }));

    expect(screen.getByText('Addition rules')).toBeInTheDocument();
    expect(screen.getByText('Start with the bigger number')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Swap the addends/i })).toBeInTheDocument();
  });

  it('renders German hub labels and representative slide copy', () => {
    const { unmount } = renderLesson(<AddingLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    expect(screen.getByRole('button', { name: /Grundlagen der Addition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Über die 10 addieren/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zweistellige Addition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merke!/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Addition basics/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Grundlagen der Addition/i }));

    expect(screen.getByText('Was bedeutet Addieren?')).toBeInTheDocument();
    expect(screen.getByText('Teil + Teil ergibt ein Ganzes.')).toBeInTheDocument();
    expect(screen.queryByText('What does it mean to add?')).not.toBeInTheDocument();

    unmount();

    renderLesson(<AddingLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    fireEvent.click(screen.getByRole('button', { name: /Über die 10 addieren/i }));

    expect(screen.getByText('Wenn die Summe über 10 geht, kannst du zuerst 10 bilden und dann den Rest addieren.')).toBeInTheDocument();
    expect(screen.getByText('+2 übrig')).toBeInTheDocument();
  });

  it('prefers gameTitle locale keys for the game and synthesis shell titles', () => {
    const customMessages = structuredClone(enMessages);
    customMessages.KangurStaticLessons.adding.game.gameTitle = 'Custom ball shell title';
    customMessages.KangurStaticLessons.adding.synthesis.gameTitle = 'Custom synthesis shell title';

    renderLesson(<AddingLesson />, {
      locale: 'en',
      messages: customMessages,
    });

    fireEvent.click(screen.getByRole('button', { name: /Ball game/i }));
    expect(
      within(screen.getByTestId('adding-lesson-game-shell')).getByText('Custom ball shell title')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to topics/i }));
    fireEvent.click(screen.getByRole('button', { name: /Addition synthesis/i }));
    expect(
      within(screen.getByTestId('adding-lesson-synthesis-shell')).getByText(
        'Custom synthesis shell title'
      )
    ).toBeInTheDocument();
  });
});
