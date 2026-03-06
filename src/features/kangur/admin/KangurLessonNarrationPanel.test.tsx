/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import { KangurLessonNarrationPanel } from '@/features/kangur/admin/KangurLessonNarrationPanel';

describe('KangurLessonNarrationPanel', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    window.localStorage.clear();
  });

  it('builds a narration script from the current lesson draft and generates audio preview', async () => {
    apiPostMock.mockResolvedValue({
      mode: 'audio',
      voice: 'sage',
      segments: [
        {
          id: 'geometry-segment-1',
          text: 'Figury z opisem lektora. Czytaj ten tekst inaczej.',
          audioUrl: '/uploads/kangur/tts/example.mp3',
          createdAt: '2026-03-06T12:00:00.000Z',
        },
      ],
    });

    const { container } = render(
      <KangurLessonNarrationPanel
        lesson={{
          id: 'geometry-advanced',
          title: 'Figury z opisem lektora',
          description: '',
        }}
        document={{
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Widoczny tekst dla ucznia.</p>',
              ttsText: 'Czytaj ten tekst inaczej.',
              align: 'left',
            },
            {
              id: 'svg-1',
              type: 'svg',
              title: 'Widoczny tytul ilustracji',
              ttsDescription: 'To jest opis narracyjny ilustracji.',
              markup: '<svg viewBox="0 0 100 100"></svg>',
              viewBox: '0 0 100 100',
              align: 'center',
              fit: 'contain',
              maxWidth: 420,
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText((content) => content.includes('Czytaj ten tekst inaczej.'))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('To jest opis narracyjny ilustracji.'))
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Narration voice'), {
      target: { value: 'sage' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate audio preview/i }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    const [endpoint, payload] = apiPostMock.mock.calls[0] as [
      string,
      { voice: string; forceRegenerate: boolean; script: { segments: Array<{ text: string }> } },
    ];
    expect(endpoint).toBe('/api/kangur/tts');
    expect(payload.voice).toBe('sage');
    expect(payload.forceRegenerate).toBe(false);
    expect(payload.script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Czytaj ten tekst inaczej.'
    );
    expect(payload.script.segments.map((segment) => segment.text).join(' ')).toContain(
      'To jest opis narracyjny ilustracji.'
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /refresh preview/i })).toBeInTheDocument()
    );

    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBe('/uploads/kangur/tts/example.mp3');
    expect(screen.getByText(/Last built:/i)).toBeInTheDocument();
  });

  it('forces regeneration when requested', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        mode: 'audio',
        voice: 'coral',
        segments: [
          {
            id: 'clock-segment-1',
            text: 'Nauka zegara.',
            audioUrl: '/uploads/kangur/tts/example-a.mp3',
            createdAt: '2026-03-06T12:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        mode: 'audio',
        voice: 'coral',
        segments: [
          {
            id: 'clock-segment-1',
            text: 'Nauka zegara.',
            audioUrl: '/uploads/kangur/tts/example-b.mp3',
            createdAt: '2026-03-06T12:05:00.000Z',
          },
        ],
      });

    render(
      <KangurLessonNarrationPanel
        lesson={{
          id: 'clock',
          title: 'Nauka zegara',
          description: 'Czytamy godziny i minuty.',
        }}
        document={{
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Zegar ma wskazowki.</p>',
              align: 'left',
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /generate audio preview/i }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /regenerate audio/i }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));

    const secondPayload = apiPostMock.mock.calls[1]?.[1] as {
      forceRegenerate: boolean;
    };
    expect(secondPayload.forceRegenerate).toBe(true);
  });
});
