/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@/__tests__/test-utils';
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
import { buildKangurAiTutorNativeGuideLocaleScaffold } from '@/features/kangur/server/ai-tutor-native-guide-locale-scaffold';

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
        name: new RegExp(repairKangurPolishCopy('Naglowek lekcji'), 'i'),
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
      'Główna treść lekcji',
      'Nagłówek lekcji',
    ]);
    expect(screen.getByLabelText('Native guide sort order')).toHaveValue(20);
    expect(screen.getByLabelText('Native guide entry title')).toHaveValue(
      'Nagłówek lekcji'
    );
    expect(screen.getByLabelText('Native guide sort order')).toHaveValue(20);
  });

  it('shows a clean manifest coverage report for the seeded Mongo guide store', async () => {
    render(<KangurAiTutorNativeGuideSettingsPanel />);

    expect(
      await screen.findByText(/tracked sections covered/)
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
      await screen.findByText(/tracked sections covered/)
    ).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('1 section needs attention'))).toBeInTheDocument();
    expect(screen.getByText('SharedChrome: Akcja logowania w nawigacji')).toBeInTheDocument();
    expect(screen.getByText('Missing guide ids: auth-login-action')).toBeInTheDocument();
  });

  it('shows scaffolded, manual, and source-copy translation badges for guide entries', async () => {
    const englishStore = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'en',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
    });
    const germanStore = buildKangurAiTutorNativeGuideLocaleScaffold({
      locale: 'de',
      sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
      existingStore: {
        locale: 'de',
        entries: [
          {
            ...buildKangurAiTutorNativeGuideLocaleScaffold({
              locale: 'de',
              sourceStore: DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
            }).entries.find((entry) => entry.id === 'auth-overview')!,
            title: 'Eigene Auth Uebersicht',
          },
        ],
      },
    });

    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/kangur/ai-tutor/native-guide?locale=en') {
        return englishStore;
      }
      if (path === '/api/kangur/ai-tutor/native-guide?locale=de') {
        return germanStore;
      }
      return DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE;
    });

    render(<KangurAiTutorNativeGuideSettingsPanel />);

    const authOverviewButton = await screen.findByRole('button', {
      name: new RegExp(repairKangurPolishCopy('Ekran logowania i zakladania konta'), 'i'),
    });

    expect(within(authOverviewButton).getByText('EN scaffolded')).toBeInTheDocument();
    expect(within(authOverviewButton).getByText('DE manual')).toBeInTheDocument();
    expect(screen.getAllByText('37 source copy')).toHaveLength(2);
    expect(screen.getAllByText('1 manual')).toHaveLength(1);
  });
});
