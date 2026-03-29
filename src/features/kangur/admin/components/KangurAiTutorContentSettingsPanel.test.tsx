/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  type KangurAiTutorContent,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { buildKangurAiTutorContentLocaleScaffold } from '@/features/kangur/server/ai-tutor-content-locale-scaffold';

import { KangurAiTutorContentSettingsPanel } from './KangurAiTutorContentSettingsPanel';

describe('KangurAiTutorContentSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGetMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
    apiPostMock.mockResolvedValue(DEFAULT_KANGUR_AI_TUTOR_CONTENT);
  });

  it('shows translation summary badges for the structured AI Tutor content sections', async () => {
    const englishContent = buildKangurAiTutorContentLocaleScaffold({
      locale: 'en',
      sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    });
    const germanContent = {
      ...buildKangurAiTutorContentLocaleScaffold({
        locale: 'de',
        sourceContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      }),
      guidedCallout: DEFAULT_KANGUR_AI_TUTOR_CONTENT.guidedCallout,
      guestIntro: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro,
        initial: {
          ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.guestIntro.initial,
          headline: 'Eigene Begruessung fuer Eltern',
        },
      },
    } satisfies KangurAiTutorContent;

    apiGetMock.mockImplementation(
      async (_path: string, options?: { params?: { locale?: string } }) => {
        const locale = options?.params?.locale ?? 'pl';
        if (locale === 'en') {
          return englishContent;
        }
        if (locale === 'de') {
          return germanContent;
        }
        return DEFAULT_KANGUR_AI_TUTOR_CONTENT;
      }
    );

    render(<KangurAiTutorContentSettingsPanel />);

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/content', {
        params: { locale: 'pl' },
        logError: false,
      });
    });

    expect(await screen.findByText('Translation Monitor')).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('DE')).toBeInTheDocument();

    const guestIntroCard = screen.getByText('Guest intro').closest('.rounded-2xl');
    if (!guestIntroCard) {
      throw new Error('Expected guest intro card to be rendered.');
    }
    expect(within(guestIntroCard).getByText('EN scaffolded')).toBeInTheDocument();
    expect(within(guestIntroCard).getByText('DE manual')).toBeInTheDocument();

    const guidedCalloutCard = screen.getByText('Guided callout').closest('.rounded-2xl');
    if (!guidedCalloutCard) {
      throw new Error('Expected guided callout card to be rendered.');
    }
    expect(within(guidedCalloutCard).getByText('DE source copy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manual' }));

    expect(within(guestIntroCard).getByText('DE manual')).toBeInTheDocument();
    expect(within(guestIntroCard).queryByText('EN scaffolded')).not.toBeInTheDocument();
    expect(within(guidedCalloutCard).queryByText('DE source copy')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Source copy' }));

    expect(within(guestIntroCard).getByText('DE manual')).toBeInTheDocument();
    expect(within(guidedCalloutCard).getByText('DE source copy')).toBeInTheDocument();
    expect(within(guestIntroCard).queryByText('EN scaffolded')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Scaffolded' }));

    expect(within(guestIntroCard).getByText('EN scaffolded')).toBeInTheDocument();
    expect(screen.getByText('Home onboarding')).toBeInTheDocument();
  });
});
