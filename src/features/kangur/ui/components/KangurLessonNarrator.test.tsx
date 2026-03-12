/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';

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
const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('next-auth/react', () => ({
  useSession: useSessionMock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import { KANGUR_NARRATOR_SETTINGS_KEY } from '@/features/kangur/settings';
import { KangurLessonNarrator } from '@/features/kangur/ui/components/KangurLessonNarrator';

function NarratorHarness({
  readLabel = 'Read lesson',
  pauseLabel = 'Pause',
  resumeLabel = 'Resume',
}: {
  readLabel?: string;
  pauseLabel?: string;
  resumeLabel?: string;
} = {}): React.JSX.Element {
  const lessonContentRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <ContextRegistryPageProvider
      pageId='kangur:Lessons'
      title='Kangur Lessons'
      rootNodeIds={['page:kangur-lessons']}
    >
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
        pauseLabel={pauseLabel}
        readLabel={readLabel}
        resumeLabel={resumeLabel}
      />
    </ContextRegistryPageProvider>
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
    useSessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

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
      expect(screen.getByRole('button', { name: /^read lesson$/i })).toBeInTheDocument()
    );

    expect(screen.getByTestId('lesson-narrator-shell')).toHaveClass('w-full');
    expect(screen.queryByText('Lesson narrator')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^read lesson$/i }));

    await waitFor(() => expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1));

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^pause$/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.queryByRole('button', { name: /^stop$/i })).toBeNull();
    expect(screen.queryByText('Voice')).toBeNull();
    expect(screen.queryByText('Playback speed')).toBeNull();
  });

  it('keeps the narrator pill width stable when the label changes from Czytaj to Pauza', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_NARRATOR_SETTINGS_KEY) {
        return JSON.stringify({ engine: 'client' });
      }
      return undefined;
    });

    render(
      <NarratorHarness readLabel='Czytaj' pauseLabel='Pauza' resumeLabel='Wznow' />
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^czytaj$/i })).toBeInTheDocument()
    );

    const readButton = screen.getByRole('button', { name: /^czytaj$/i });
    const initialMinWidth = readButton.style.minWidth;

    expect(initialMinWidth).not.toBe('');

    fireEvent.click(readButton);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^pauza$/i })).toBeInTheDocument()
    );

    expect(screen.getByRole('button', { name: /^pauza$/i }).style.minWidth).toBe(initialMinWidth);
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
      expect(screen.getByRole('button', { name: /^read lesson$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^read lesson$/i }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/tts',
      expect.objectContaining({
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
        contextRegistry: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({ id: 'page:kangur-lessons', kind: 'static_node' }),
            expect.objectContaining({ id: 'component:kangur-lesson-narrator', kind: 'static_node' }),
            expect.objectContaining({ id: 'action:kangur-lesson-tts', kind: 'static_node' }),
          ]),
        }),
      })
    );
    expect(audioPlayMock).toHaveBeenCalled();
    expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    expect(screen.queryByText('Voice')).toBeNull();
    expect(screen.queryByText('Playback speed')).toBeNull();
  });

  it('falls back to browser speech without surfacing narrator diagnostics to regular users', async () => {
    apiPostMock.mockResolvedValue({
      mode: 'fallback',
      reason: 'generation_failed',
      message:
        'Neural narration could not be prepared right now, so browser narration fallback will be used.',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'To jest tekst lekcji do czytania przez narratora.',
        },
      ],
    });

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^read lesson$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^read lesson$/i }));

    await waitFor(() => expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1));

    expect(audioPlayMock).not.toHaveBeenCalled();
    expect(
      (speechSynthesisMock.speak.mock.calls[0]?.[0] as MockSpeechSynthesisUtterance)?.text
    ).toBe('To jest tekst lekcji do czytania przez narratora.');
    expect(
      screen.queryByText(
        /Neural narration could not be prepared right now, so browser narration fallback will be used\./i
      )
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Switch Kangur narrator settings to Client narrator if you want browser speech instead\./i)
    ).not.toBeInTheDocument();
  });

  it('shows narrator diagnostics to super admins when server fallback is used', async () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    });
    apiPostMock.mockResolvedValue({
      mode: 'fallback',
      reason: 'generation_failed',
      message:
        'Neural narration could not be prepared right now, so browser narration fallback will be used.',
      segments: [
        {
          id: 'clock-segment-1',
          text: 'To jest tekst lekcji do czytania przez narratora.',
        },
      ],
    });

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^read lesson$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^read lesson$/i }));

    await waitFor(() => expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1));

    expect(
      screen.getByText(
        /Neural narration could not be prepared right now, so browser narration fallback will be used\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Switch Kangur narrator settings to Client narrator if you want browser speech instead\./i)
    ).toBeInTheDocument();
  });

  it('renders shared error feedback when narration preparation fails', async () => {
    apiPostMock.mockRejectedValueOnce(new Error('Narrator network failed.'));

    render(<NarratorHarness />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^read lesson$/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /^read lesson$/i }));

    await waitFor(() => expect(screen.getByText('Narrator network failed.')).toBeInTheDocument());

    expect(screen.getByText('Narrator network failed.').parentElement).toHaveClass(
      'soft-card'
    );
  });
});
