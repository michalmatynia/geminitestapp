/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRecommendedKangurModeMock, useKangurGameRuntimeMock } = vi.hoisted(() => ({
  getRecommendedKangurModeMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
}));

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl' | 'uk',
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
    (namespace?: string) =>
    (key: string) =>
      translationState.missing
        ? key
        : (
            {
              'KangurGameHomeActions.actions.kangur': {
                de: 'Mathe-Kanguru',
                en: 'Math Kangaroo',
                pl: 'Kangur Matematyczny',
              },
              'KangurGamePage.screens.kangur_setup.description': {
                de: 'Bereite eine Mathe-Kanguru-Sitzung vor.',
                en: 'Prepare a Mathematical Kangaroo session.',
                pl: 'Przygotuj sesje Kangura Matematycznego.',
              },
              'KangurGamePage.screens.kangur_setup.label': {
                de: 'Mathe-Kanguru-Sitzung einrichten',
                en: 'Mathematical Kangaroo session setup',
                pl: 'Konfiguracja sesji Kangura Matematycznego',
              },
            } as const
          )[`${namespace}.${key}`]?.[localeState.value] ?? key,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/services/game-setup-recommendations', () => ({
  getRecommendedKangurMode: getRecommendedKangurModeMock,
}));

vi.mock('@/features/kangur/ui/components/KangurGameSetupStage', () => ({
  KangurGameSetupStage: ({
    children,
    description,
    testId,
    title,
    visualTitle,
  }: {
    children: React.ReactNode;
    description: React.ReactNode;
    testId: string;
    title: string;
    visualTitle?: React.ReactNode;
  }) => (
    <section data-testid={testId}>
      <h1>{title}</h1>
      <div data-testid='mock-kangur-stage-description'>{description}</div>
      {visualTitle}
      {children}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurSetup', () => ({
  default: () => <div data-testid='mock-kangur-setup'>mock-kangur-setup</div>,
}));

import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';

describe('KangurGameKangurSetupWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    translationState.missing = false;
    getRecommendedKangurModeMock.mockReturnValue({
      description: 'Łatwiejszy zestaw treningowy pozwoli wejść w formule Kangura.',
      label: 'Łagodny start',
      mode: 'training_3pt',
      title: 'Polecamy zacząć od treningu 3-punktowego',
    });
    useKangurGameRuntimeMock.mockReturnValue({
      handleHome: vi.fn(),
      handleStartKangur: vi.fn(),
      progress: {},
      screen: 'kangur_setup',
    });
  });

  it('renders the English Math Kangaroo wordmark as SVG text while keeping the setup title localized', () => {
    localeState.value = 'en';

    render(<KangurGameKangurSetupWidget />);

    const art = screen.getByTestId('kangur-kangur-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Mathematical Kangaroo session setup' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-stage-description')).toHaveTextContent(
      'Prepare a Mathematical Kangaroo session.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Math Kangaroo');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the German Math Kangaroo wordmark as SVG text while keeping the setup title localized', () => {
    localeState.value = 'de';

    render(<KangurGameKangurSetupWidget />);

    const art = screen.getByTestId('kangur-kangur-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Mathe-Kanguru-Sitzung einrichten' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-stage-description')).toHaveTextContent(
      'Bereite eine Mathe-Kanguru-Sitzung vor.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Mathe-Kanguru');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('falls back to Ukrainian Kangaroo setup copy when translations are unavailable', () => {
    localeState.value = 'uk';
    translationState.missing = true;

    render(<KangurGameKangurSetupWidget />);

    const art = screen.getByTestId('kangur-kangur-heading-art');
    const text = art.querySelector('text');

    expect(
      screen.getByRole('heading', { name: 'Налаштування сесії Математичного Кенгуру' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-stage-description')).toHaveTextContent(
      'Підготуйте сесію Математичного Кенгуру.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Математичний Кенгуру');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('falls back to German Kangaroo setup copy instead of Polish when translations are unavailable', () => {
    localeState.value = 'de';
    translationState.missing = true;

    render(<KangurGameKangurSetupWidget />);

    const art = screen.getByTestId('kangur-kangur-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Mathe-Kanguru' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-kangur-stage-description')).toHaveTextContent(
      'Wähle die Wettbewerbsedition und das Aufgabenset zum Lösen aus.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Mathe-Kanguru');
  });
});
