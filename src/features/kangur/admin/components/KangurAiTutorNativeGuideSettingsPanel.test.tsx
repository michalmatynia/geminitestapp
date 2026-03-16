/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';

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

vi.mock('@/features/kangur/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
    }),
  };
});

import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideStore,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';

import { KangurAiTutorNativeGuideSettingsPanel } from './KangurAiTutorNativeGuideSettingsPanel';

describe('KangurAiTutorNativeGuideSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
    apiPostMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
  });

  it('reorders the selected guide entry and keeps the structured editor in sync', async () => {
    render(<KangurAiTutorNativeGuideSettingsPanel />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/native-guide?locale=pl',
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(repairKangurPolishCopy('Nagłówek lekcji'), 'i'),
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));

    const jsonEditor = screen.getByLabelText('Native guide JSON');
    if (!(jsonEditor instanceof HTMLTextAreaElement)) {
      throw new Error('Expected the native guide JSON editor to be a textarea.');
    }
    const parsedStore = JSON.parse(jsonEditor.value) as KangurAiTutorNativeGuideStore;
    const reorderedTitles = parsedStore.entries.slice(0, 3).map((entry) => entry.title);

    expect(reorderedTitles).toEqual([
      'Ekran lekcji',
      repairKangurPolishCopy('Główna treść lekcji'),
      repairKangurPolishCopy('Nagłówek lekcji'),
    ]);
    expect(parsedStore.entries[2]?.sortOrder).toBe(30);
    expect(screen.getByLabelText('Native guide entry title')).toHaveValue(
      repairKangurPolishCopy('Nagłówek lekcji')
    );
    expect(screen.getByLabelText('Native guide sort order')).toHaveValue(30);
  });

  it('shows a clean manifest coverage report for the seeded Mongo guide store', async () => {
    render(<KangurAiTutorNativeGuideSettingsPanel />);

    expect(
      await screen.findByText(/tracked sections covered/i)
    ).toBeInTheDocument();
    expect(screen.getByText('No manifest gaps')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Every tracked Kangur section is backed by an enabled Mongo native-guide entry.'
      )
    ).toBeInTheDocument();
  });

  it('flags missing or disabled guide entries in the manifest coverage report', async () => {
    const brokenStore = JSON.parse(
      JSON.stringify(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE)
    ) as KangurAiTutorNativeGuideStore;
    brokenStore.entries = brokenStore.entries.filter((entry) => entry.id !== 'auth-login-action');
    apiGetMock.mockResolvedValueOnce(brokenStore);

    render(<KangurAiTutorNativeGuideSettingsPanel />);

    expect(
      await screen.findByText(/tracked sections covered/i)
    ).toBeInTheDocument();
    expect(screen.getByText('1 section needs attention')).toBeInTheDocument();
    expect(screen.getByText('SharedChrome: Akcja logowania w nawigacji')).toBeInTheDocument();
    expect(screen.getByText('Missing guide ids: auth-login-action')).toBeInTheDocument();
  });
});
