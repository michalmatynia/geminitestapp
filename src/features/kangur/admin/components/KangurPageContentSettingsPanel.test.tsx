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
import type { KangurPageContentStore } from '@/shared/contracts/kangur-page-content';

import { KangurPageContentSettingsPanel } from './KangurPageContentSettingsPanel';

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

    expect(await screen.findByText('50 / 50 tracked sections covered')).toBeInTheDocument();
    expect(screen.getByText('No manifest gaps')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Every tracked Kangur section is backed by an enabled Mongo page-content entry with the expected native-guide links.'
      )
    ).toBeInTheDocument();
  });

  it('keeps the raw JSON editor in sync with structured entry edits', async () => {
    render(<KangurPageContentSettingsPanel />);

    await screen.findByText('50 / 50 tracked sections covered');

    fireEvent.click(screen.getByRole('button', { name: /Ranking na stronie glownej/i }));
    fireEvent.change(screen.getByLabelText('Page content title'), {
      target: { value: 'Ranking glownej planszy' },
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

    expect(updatedEntry?.title).toBe('Ranking glownej planszy');
    expect(updatedEntry?.nativeGuideIds).toEqual(['shared-leaderboard', 'shared-progress']);
  });
});
