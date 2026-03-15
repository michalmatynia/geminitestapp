/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPostMock, toastMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import { DEFAULT_KANGUR_PAGE_CONTENT_STORE } from '@/features/kangur/page-content-catalog';
import {
  parseKangurPageContentStore,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';

import { KangurPageContentSettingsPanel } from './KangurPageContentSettingsPanel';

const coverageLabel = `${DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries.length} / ${
  DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries.length
} tracked sections covered`;
const getSectionLabel = (entryId: string): string => {
  const entry = DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries.find((item) => item.id === entryId);
  if (!entry?.title) {
    throw new Error(`Expected page-content entry with title for ${entryId}.`);
  }
  return `Section: ${entry.title}`;
};

describe('KangurPageContentSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue(DEFAULT_KANGUR_PAGE_CONTENT_STORE);
    apiPostMock.mockResolvedValue(DEFAULT_KANGUR_PAGE_CONTENT_STORE);
  });

  it('shows a clean manifest coverage report for the seeded page-content store', async () => {
    render(<KangurPageContentSettingsPanel />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/page-content?locale=pl',
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    expect(await screen.findByText(coverageLabel)).toBeInTheDocument();
    expect(screen.getByText('No manifest gaps')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Every tracked Kangur section is backed by an enabled Mongo page-content entry with the expected native-guide links.'
      )
    ).toBeInTheDocument();
  });

  it('keeps the raw JSON editor in sync with structured entry edits', async () => {
    render(<KangurPageContentSettingsPanel />);

    await screen.findByText(coverageLabel);

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(getSectionLabel('game-home-leaderboard'), 'i') })
    );
    fireEvent.change(screen.getByLabelText('Page content title'), {
      target: { value: 'Ranking głównej planszy' },
    });
    fireEvent.change(screen.getByLabelText('Page content native guide ids'), {
      target: { value: 'shared-leaderboard\nshared-progress' },
    });

    const jsonEditor = screen.getByLabelText('Page content JSON');
    if (!(jsonEditor instanceof HTMLTextAreaElement)) {
      throw new Error('Expected the page content JSON editor to be a textarea.');
    }

    const parsedStore = JSON.parse(jsonEditor.value) as KangurPageContentStore;
    const updatedEntry = parsedStore.entries.find((entry) => entry.id === 'game-home-leaderboard');

    expect(updatedEntry?.title).toBe('Ranking głównej planszy');
    expect(updatedEntry?.nativeGuideIds).toEqual(['shared-leaderboard', 'shared-progress']);
  });

  it('keeps fragment edits in sync with the raw JSON editor', async () => {
    apiGetMock.mockResolvedValueOnce(
      parseKangurPageContentStore({
        ...DEFAULT_KANGUR_PAGE_CONTENT_STORE,
        entries: DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries.map((entry) =>
          entry.id === 'game-home-leaderboard'
            ? {
                ...entry,
                fragments: [
                  {
                    id: 'leaderboard-points',
                    text: 'Liczba punktów',
                    aliases: ['punkty'],
                    explanation: 'Początkowe wyjaśnienie fragmentu.',
                    nativeGuideIds: ['shared-leaderboard-points'],
                    triggerPhrases: ['punkty'],
                    enabled: true,
                    sortOrder: 10,
                  },
                ],
              }
            : entry
        ),
      })
    );

    render(<KangurPageContentSettingsPanel />);

    await screen.findByText(coverageLabel);

    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(getSectionLabel('game-home-leaderboard'), 'i') })
    );
    fireEvent.click(screen.getByRole('button', { name: /fragment: liczba punktów/i }));
    fireEvent.change(screen.getByLabelText('Page content fragment text'), {
      target: { value: 'Liczba punktów w rankingu' },
    });
    fireEvent.change(screen.getByLabelText('Page content fragment explanation'), {
      target: { value: 'Aktualny wynik ucznia używany do wyliczenia miejsca w rankingu.' },
    });
    fireEvent.change(screen.getByLabelText('Page content fragment aliases'), {
      target: { value: 'punkty\nwynik rankingowy' },
    });

    const jsonEditor = screen.getByLabelText('Page content JSON');
    if (!(jsonEditor instanceof HTMLTextAreaElement)) {
      throw new Error('Expected the page content JSON editor to be a textarea.');
    }

    const parsedStore = JSON.parse(jsonEditor.value) as KangurPageContentStore;
    const updatedEntry = parsedStore.entries.find((entry) => entry.id === 'game-home-leaderboard');

    expect(updatedEntry?.fragments).toEqual([
      expect.objectContaining({
        id: 'leaderboard-points',
        text: 'Liczba punktów w rankingu',
        aliases: ['punkty', 'wynik rankingowy'],
        explanation: 'Aktualny wynik ucznia używany do wyliczenia miejsca w rankingu.',
      }),
    ]);
  });
});
