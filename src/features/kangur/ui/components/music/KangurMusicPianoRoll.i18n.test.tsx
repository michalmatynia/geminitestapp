/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';
import KangurMusicPianoRoll, {
  KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS,
} from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';

const renderWithIntl = (locale: 'en' | 'de') =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'de' ? deMessages : enMessages}
    >
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-i18n-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        showKeyboardModeSwitch
        showSynthEnvelopeButton
        shellTestId='music-roll-i18n-shell'
        stepTestIdPrefix='music-roll-i18n-step'
      />
    </NextIntlClientProvider>
  );

const openSynthEnvelope = (): void => {
  fireEvent.click(screen.getByTestId('music-roll-i18n-step-keyboard-mode-synth'));
  fireEvent.click(screen.getByTestId('music-roll-i18n-step-synth-envelope-button'));
};

describe('KangurMusicPianoRoll i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders English ADSR modal copy from locale messages', () => {
    renderWithIntl('en');
    openSynthEnvelope();

    expect(screen.getByTestId('music-roll-i18n-shell')).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    expect(screen.getByTestId('music-roll-i18n-key-do')).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.keyClassName
    );
    expect(screen.getByTestId('music-roll-i18n-step-synth-envelope-button')).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName
    );
    expect(screen.getByRole('heading', { name: 'Synth ADSR' })).toBeInTheDocument();
    expect(
      screen.getByText('Adjust the synth attack, decay, sustain level, and release.')
    ).toBeInTheDocument();
    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.getByText('Decay')).toBeInTheDocument();
    expect(screen.getByText('Sustain')).toBeInTheDocument();
    expect(screen.getByText('Release')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close ADSR settings' })).toHaveTextContent('Close');
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByText('ADSR synthu')).not.toBeInTheDocument();
  });

  it('renders German ADSR modal copy from locale messages', () => {
    renderWithIntl('de');
    openSynthEnvelope();

    expect(screen.getByTestId('music-roll-i18n-shell')).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    expect(screen.getByRole('heading', { name: 'Synth-ADSR' })).toBeInTheDocument();
    expect(
      screen.getByText('Stelle Attack, Decay, Sustain und Release des Synths ein.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ADSR-Einstellungen schließen' })).toHaveTextContent(
      'Schließen'
    );
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schließen' })).toBeInTheDocument();
    expect(screen.queryByText('Close ADSR settings')).not.toBeInTheDocument();
  });
});
