/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, toastMock, apiGetMock, apiPostMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  toastMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
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

import { AdminKangurAiTutorContentPage } from '@/features/kangur/admin/AdminKangurAiTutorContentPage';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

describe('AdminKangurAiTutorContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/kangur/ai-tutor/content') {
        return DEFAULT_KANGUR_AI_TUTOR_CONTENT;
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    apiPostMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    settingsStoreMock.get.mockReturnValue(undefined);
  });

  it('loads Mongo-backed AI Tutor content and saves edited content JSON', async () => {
    render(<AdminKangurAiTutorContentPage />);

    await waitFor(() =>
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/content', {
        params: { locale: 'pl' },
        logError: false,
      })
    );

    const contentEditor = await screen.findByLabelText(/tutor content json/i);
    expect((contentEditor as HTMLTextAreaElement).value).toContain('"locale": "pl"');

    const nextContent = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      navigation: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.navigation,
        restoreTutorLabel: 'Przywróć AI Tutora',
      },
    };
    apiPostMock.mockResolvedValueOnce(nextContent);

    fireEvent.change(contentEditor, {
      target: {
        value: `${JSON.stringify(nextContent, null, 2)}\n`,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /save mongo content/i }));

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/content',
        nextContent,
        { logError: false }
      )
    );

    expect(toastMock).toHaveBeenCalledWith('Kangur AI Tutor content saved.', {
      variant: 'success',
    });
  });

  it('edits onboarding copy through the structured AI Tutor content editor', async () => {
    render(<AdminKangurAiTutorContentPage />);

    const headlineInput = await screen.findByLabelText(/ai tutor initial guest intro headline/i);
    const saveButton = screen.getByRole('button', { name: /save mongo content/i });

    expect(headlineInput).toHaveValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro.initial.headline);

    const nextContent = {
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      guestIntro: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro,
        initial: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro.initial,
          headline: 'Witaj w StudiQ',
        },
      },
    };
    apiPostMock.mockResolvedValueOnce(nextContent);

    fireEvent.change(headlineInput, {
      target: { value: 'Witaj w StudiQ' },
    });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(apiPostMock).toHaveBeenCalledWith(
        '/api/kangur/ai-tutor/content',
        nextContent,
        { logError: false }
      )
    );
  });

  it('blocks saving AI Tutor content when structured onboarding validation finds placeholder copy', async () => {
    render(<AdminKangurAiTutorContentPage />);

    const headlineInput = await screen.findByLabelText(/ai tutor initial guest intro headline/i);
    const saveButton = screen.getByRole('button', { name: /save mongo content/i });

    fireEvent.change(headlineInput, {
      target: { value: 'TODO uzupełnić nagłówek' },
    });

    expect(
      await screen.findAllByText(/remove placeholder or unfinished onboarding copy/i)
    ).toHaveLength(2);
    expect(saveButton).toBeDisabled();
    expect(apiPostMock).not.toHaveBeenCalledWith(
      '/api/kangur/ai-tutor/content',
      expect.anything(),
      { logError: false }
    );
  });
});
