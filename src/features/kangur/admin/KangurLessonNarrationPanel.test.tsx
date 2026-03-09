/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContextRegistryPageProvider } from '@/features/ai/ai-context-registry/context/page-context';

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import { KangurLessonNarrationPanel } from '@/features/kangur/admin/KangurLessonNarrationPanel';
import { LessonContentEditorProvider } from '@/features/kangur/admin/context/LessonContentEditorContext';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';

function StatefulNarrationPanelHarness({
  lesson,
  document,
}: {
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description'>;
  document: KangurLessonDocument;
}): React.JSX.Element {
  const [value, setValue] = React.useState(document);

  return (
    <ContextRegistryPageProvider
      pageId='admin:kangur-lessons-manager'
      title='Kangur Lessons Manager'
      rootNodeIds={['page:kangur-admin-lessons-manager']}
    >
      <LessonContentEditorProvider
        lesson={lesson as KangurLesson}
        document={value}
        onChange={setValue}
      >
        <KangurLessonNarrationPanel />
      </LessonContentEditorProvider>
    </ContextRegistryPageProvider>
  );
}

describe('KangurLessonNarrationPanel', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
  });

  it('builds a narration script from the current lesson draft and generates audio preview', async () => {
    apiPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/kangur/tts/status') {
        return {
          state: 'missing',
          voice: 'sage',
          latestCreatedAt: null,
          message: 'Audio has not been generated for this lesson draft yet.',
          segments: [],
        };
      }

      return {
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
      };
    });

    const { container } = render(
      <StatefulNarrationPanelHarness
        lesson={{
          id: 'geometry-advanced',
          title: 'Figury z opisem lektora',
          description: '',
        }}
        document={{
          version: 1,
          narration: {
            voice: 'coral',
            locale: 'pl-PL',
          },
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
    fireEvent.change(screen.getByLabelText('Narration locale'), {
      target: { value: 'en-US' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate audio preview/i }));

    await waitFor(() =>
      expect(apiPostMock.mock.calls.some((call) => call[0] === '/api/kangur/tts')).toBe(true)
    );

    const generateCall = apiPostMock.mock.calls.find((call) => call[0] === '/api/kangur/tts');
    const [endpoint, payload] = generateCall as [
      string,
      {
        voice: string;
        forceRegenerate: boolean;
        script: { locale: string; segments: Array<{ text: string }> };
        contextRegistry?: {
          refs: Array<{ id: string; kind: string }>;
          engineVersion: string;
        };
      },
    ];
    expect(endpoint).toBe('/api/kangur/tts');
    expect(payload.voice).toBe('sage');
    expect(payload.forceRegenerate).toBe(false);
    expect(payload.script.locale).toBe('en-US');
    expect(payload.script.segments.map((segment) => segment.text).join(' ')).toContain(
      'Czytaj ten tekst inaczej.'
    );
    expect(payload.script.segments.map((segment) => segment.text).join(' ')).toContain(
      'To jest opis narracyjny ilustracji.'
    );
    expect(payload.contextRegistry?.refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'page:kangur-admin-lessons-manager', kind: 'static_node' }),
        expect.objectContaining({
          id: 'component:kangur-lesson-narration-panel',
          kind: 'static_node',
        }),
        expect.objectContaining({ id: 'action:kangur-lesson-tts', kind: 'static_node' }),
      ])
    );

    const statusCall = apiPostMock.mock.calls.find((call) => call[0] === '/api/kangur/tts/status');
    expect(statusCall?.[1]).toEqual(
      expect.objectContaining({
        contextRegistry: expect.objectContaining({
          refs: expect.arrayContaining([
            expect.objectContaining({ id: 'page:kangur-admin-lessons-manager' }),
            expect.objectContaining({ id: 'component:kangur-lesson-narration-panel' }),
            expect.objectContaining({ id: 'action:kangur-lesson-tts' }),
          ]),
        }),
      })
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
    apiPostMock.mockImplementation(
      async (endpoint: string, body?: { forceRegenerate?: boolean }) => {
        if (endpoint === '/api/kangur/tts/status') {
          return {
            state: 'missing',
            voice: 'coral',
            latestCreatedAt: null,
            message: 'Audio has not been generated for this lesson draft yet.',
            segments: [],
          };
        }

        return body?.forceRegenerate
          ? {
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
            }
          : {
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
            };
      }
    );

    render(
      <StatefulNarrationPanelHarness
        lesson={{
          id: 'clock',
          title: 'Nauka zegara',
          description: 'Czytamy godziny i minuty.',
        }}
        document={{
          version: 1,
          narration: {
            voice: 'coral',
            locale: 'pl-PL',
          },
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
    await waitFor(() =>
      expect(apiPostMock.mock.calls.filter((call) => call[0] === '/api/kangur/tts')).toHaveLength(1)
    );

    fireEvent.click(screen.getByRole('button', { name: /regenerate audio/i }));
    await waitFor(() =>
      expect(apiPostMock.mock.calls.filter((call) => call[0] === '/api/kangur/tts')).toHaveLength(2)
    );

    const generateCalls = apiPostMock.mock.calls.filter((call) => call[0] === '/api/kangur/tts');
    const secondPayload = generateCalls[1]?.[1] as {
      forceRegenerate: boolean;
    };
    expect(secondPayload.forceRegenerate).toBe(true);
  });

  it('loads cached audio preview automatically when status is ready', async () => {
    apiPostMock.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/kangur/tts/status') {
        return {
          state: 'ready',
          voice: 'coral',
          latestCreatedAt: '2026-03-06T12:00:00.000Z',
          message: 'Cached audio is available for this lesson draft.',
          segments: [
            {
              id: 'clock-segment-1',
              text: 'Nauka zegara.',
              audioUrl: '/uploads/kangur/tts/cached.mp3',
              createdAt: '2026-03-06T12:00:00.000Z',
            },
          ],
        };
      }

      throw new Error('Generate endpoint should not be called in this scenario.');
    });

    const { container } = render(
      <StatefulNarrationPanelHarness
        lesson={{
          id: 'clock',
          title: 'Nauka zegara',
          description: 'Czytamy godziny i minuty.',
        }}
        document={{
          version: 1,
          narration: {
            voice: 'coral',
            locale: 'pl-PL',
          },
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

    await waitFor(() =>
      expect(apiPostMock.mock.calls.some((call) => call[0] === '/api/kangur/tts/status')).toBe(true)
    );

    expect(apiPostMock.mock.calls.filter((call) => call[0] === '/api/kangur/tts')).toHaveLength(0);
    expect(screen.getByText(/Neural preview ready/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh preview/i })).toBeInTheDocument();
    const audio = container.querySelector('audio');
    expect(audio?.getAttribute('src')).toBe('/uploads/kangur/tts/cached.mp3');
  });
});
