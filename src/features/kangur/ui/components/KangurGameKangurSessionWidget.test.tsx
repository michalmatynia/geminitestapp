/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useKangurGameRuntimeMock } = vi.hoisted(() => ({
  useKangurGameRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/context/KangurGameContext', () => ({
  KangurGameProvider: ({
    children,
    mode,
  }: {
    children: React.ReactNode;
    mode: string | null;
  }) => <div data-testid='kangur-session-provider'>mode:{mode}{children}</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurGame', () => ({
  default: () => <div data-testid='kangur-session-game'>kangur-game</div>,
}));

import { KangurGameKangurSessionWidget } from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';

describe('KangurGameKangurSessionWidget', () => {
  it('renders the active recommendation above the Kangur session', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      activeSessionRecommendation: {
        description: 'Ten zestaw najlepiej pasuje do obecnej skutecznosci i serii.',
        label: 'Gotowosc konkursowa',
        source: 'kangur_setup',
        title: 'Polecamy pelny test konkursowy',
      },
      kangurMode: 'full_test_2024',
      screen: 'kangur',
      setScreen: vi.fn(),
    });

    render(<KangurGameKangurSessionWidget />);

    expect(screen.getByTestId('kangur-kangur-session-recommendation-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-kangur-session-recommendation-chip')).toHaveTextContent(
      'Polecony kierunek'
    );
    expect(screen.getByTestId('kangur-kangur-session-recommendation-label')).toHaveTextContent(
      'Gotowosc konkursowa'
    );
    expect(screen.getByTestId('kangur-kangur-session-recommendation-title')).toHaveTextContent(
      'Polecamy pelny test konkursowy'
    );
    expect(
      screen.getByTestId('kangur-kangur-session-recommendation-description')
    ).toHaveTextContent('Ten zestaw najlepiej pasuje do obecnej skutecznosci i serii.');
    expect(screen.getByTestId('kangur-session-provider')).toHaveTextContent('mode:full_test_2024');
    expect(screen.getByTestId('kangur-session-game')).toBeInTheDocument();
  });

  it('stays hidden outside the Kangur session screen', () => {
    useKangurGameRuntimeMock.mockReturnValue({
      activeSessionRecommendation: null,
      kangurMode: null,
      screen: 'home',
      setScreen: vi.fn(),
    });

    const { container } = render(<KangurGameKangurSessionWidget />);

    expect(container).toBeEmptyDOMElement();
  });
});
