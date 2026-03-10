/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: apiGetMock,
    },
  };
});

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  formatKangurAiTutorTemplate,
} from '@/shared/contracts/kangur-ai-tutor-content';
import {
  KangurAiTutorContentProvider,
  useKangurAiTutorContent,
} from './KangurAiTutorContentContext';

function Harness(): React.JSX.Element {
  const content = useKangurAiTutorContent();

  return (
    <div>
      <div data-testid='restore-label'>{content.navigation.restoreTutorLabel}</div>
      <div data-testid='step-label'>
        {formatKangurAiTutorTemplate(content.homeOnboarding.stepLabelTemplate, {
          current: 2,
          total: 5,
        })}
      </div>
    </div>
  );
}

describe('KangurAiTutorContentContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('falls back to the default AI tutor content when no provider is mounted', () => {
    render(<Harness />);

    expect(screen.getByTestId('restore-label')).toHaveTextContent(
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.navigation.restoreTutorLabel
    );
    expect(screen.getByTestId('step-label')).toHaveTextContent('Krok 2 z 5');
  });

  it('hydrates the AI tutor content from the API when the provider is mounted', async () => {
    apiGetMock.mockResolvedValue({
      ...DEFAULT_KANGUR_AI_TUTOR_CONTENT,
      navigation: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.navigation,
        restoreTutorLabel: 'Przywróć AI Tutora',
      },
      homeOnboarding: {
        ...DEFAULT_KANGUR_AI_TUTOR_CONTENT.homeOnboarding,
        stepLabelTemplate: 'Etap {current} z {total}',
      },
    });

    render(
      <KangurAiTutorContentProvider>
        <Harness />
      </KangurAiTutorContentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('restore-label')).toHaveTextContent('Przywróć AI Tutora');
    });
    expect(screen.getByTestId('step-label')).toHaveTextContent('Etap 2 z 5');
  });
});
