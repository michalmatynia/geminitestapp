/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

import { renderKangurGameQuizShell } from '@/features/kangur/ui/components/game-quiz/KangurGameQuizShell';

function TestQuizShell({
  maxWidthClassName,
}: {
  maxWidthClassName?: string;
}): React.JSX.Element | null {
  return renderKangurGameQuizShell({
    accent: 'amber',
    children: <div data-testid='kangur-quiz-shell-child'>Gra</div>,
    icon: '🎵',
    maxWidthClassName,
    screen: 'adding_synthesis_quiz',
    shellTestId: 'kangur-quiz-shell',
  });
}

describe('KangurGameQuizShell', () => {
  afterEach(() => {
    useKangurGameRuntimeMock.mockReset();
  });

  it('forwards the configured max width class to the lesson activity shell wrapper', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      screen: 'adding_synthesis_quiz',
      setScreen: vi.fn(),
    });

    render(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <TestQuizShell maxWidthClassName='max-w-[1120px]' />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('kangur-quiz-shell').parentElement).toHaveClass(
      'mx-auto',
      'max-w-[1120px]'
    );
    expect(screen.getByTestId('kangur-quiz-shell-child')).toHaveTextContent('Gra');
  });
});
