/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, apiPostMock, speechSynthesisMock, audioPlayMock, audioPauseMock } =
  vi.hoisted(() => ({
    settingsStoreMock: {
      get: vi.fn<(key: string) => string | undefined>(),
    },
    apiPostMock: vi.fn(),
    speechSynthesisMock: {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      paused: false,
      speaking: false,
    },
    audioPlayMock: vi.fn().mockResolvedValue(undefined),
    audioPauseMock: vi.fn(),
  }));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import { KANGUR_NARRATOR_SETTINGS_KEY } from '@/features/kangur/settings';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';

function NarratorHarness(): React.JSX.Element {
  const lessonContentRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <>
      <div ref={lessonContentRef}>
        <h2>Widoczna lekcja</h2>
        <p>To jest tekst lekcji do czytania przez narratora.</p>
      </div>
      <KangurLessonNarrator
        lesson={{
          id: 'clock',
          title: 'Nauka zegara',
          description: 'Opis lekcji',
          contentMode: 'component',
        }}
        lessonDocument={null}
        lessonContentRef={lessonContentRef}
      />
    </>
  );
}

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('KangurLessonNarrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesisMock,
    });
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: audioPlayMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: audioPauseMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    });

    speechSynthesisMock.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
      speechSynthesisMock.speaking = true;
      utterance.onstart?.();
    });
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
        return JSON.stringify({ engine: 'server' });
      }
      return undefined;
    });
  });

  it('uses the client narrator mode without calling the server tts api', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
        return JSON.stringify({ engine: 'client' });
      }
      return undefined;
    });

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
    );

    expect(screen.getByTestId('lesson-narrator-shell')).toHaveClass(
      'glass-panel',
      'border-indigo-200/70'
    );
    expect(screen.getByText('Lesson narrator')).toHaveClass('border-indigo-200', 'bg-indigo-100');

    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    await waitFor(() => expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1));

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^stop$/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.queryByText('Voice')).toBeNull();
    expect(screen.queryByText('Playback speed')).toBeNull();
  });

  it('uses the server narrator mode and requests cached audio from the tts api', async () => {
    apiPostMock.mockResolvedValue({
      mode: 'audio',
      voice: 'coral',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'To jest tekst lekcji do czytania przez narratora.',
          audioUrl: '/uploads/kangur/tts/clock.mp3',
          createdAt: '2026-03-06T12:00:00.000Z',
        },
      ],
    });

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/tts', {
      forceRegenerate: false,
      script: expect.objectContaining({
        lessonId: 'clock',
        locale: 'pl-PL',
        segments: expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('To jest tekst lekcji do czytania przez narratora.'),
          }),
        ]),
      }),
      voice: 'coral',
    });
    expect(audioPlayMock).toHaveBeenCalled();
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    expect(screen.queryByText('Voice')).toBeNull();
    expect(screen.queryByText('Playback speed')).toBeNull();
  });

  it('renders shared error feedback when narration preparation fails', async () => {
    apiPostMock.mockRejectedValueOnce(new Error('Narrator network failed.'));

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^play$/i }));

    await waitFor(() => expect(screen.getByText('Narrator network failed.')).toBeInTheDocument());

    expect(screen.getByText('Narrator network failed.').parentElement).toHaveClass(
      'soft-card',
      'border-rose-300'
    );
  });
});
