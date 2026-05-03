// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import { KANGUR_CMS_PROJECT_SETTING_KEY } from './project-contracts';
import { createDefaultKangurCmsProject } from './project-defaults';
import { KangurCmsRuntimeScreen } from './KangurCmsRuntimeScreen';

const rawProjectRef = { current: undefined as string | undefined };

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: (key: string) => (key === KANGUR_CMS_PROJECT_SETTING_KEY ? rawProjectRef.current : undefined),
  }),
}));

vi.mock('@/features/kangur/ui/useKangurStorefrontAppearance', () => ({
  useKangurStorefrontAppearance: () => ({
    theme: {
      accentColor: '#ff9900',
      backgroundColor: '#ffffff',
      baseSize: 16,
      bodyFont: 'Inter',
      bodyWeight: 400,
      colorSchemes: [],
      customCss: '',
      customCssSelectors: [],
      enableAnimations: false,
      fullWidth: false,
      headingFont: 'Inter',
      headingWeight: 700,
      hoverEffect: 'none',
      hoverScale: 1,
      lineHeight: 1.5,
      mutedTextColor: '#666666',
      primaryColor: '#111111',
      secondaryColor: '#222222',
      surfaceColor: '#f5f5f5',
      textColor: '#000000',
    },
  }),
}));

vi.mock('@/features/kangur/utils/custom-css', () => ({
  buildKangurScopedCustomCss: () => null,
}));

vi.mock('@/features/cms/public', () => ({
  CmsRuntimePageRenderer: ({ components }: { components: unknown[] }) => (
    <div data-testid='cms-runtime-page-renderer' data-components={components.length} />
  ),
  getMediaInlineStyles: () => ({}),
  getMediaStyleVars: () => ({}),
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  KangurGameRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  KangurLessonsRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  KangurLearnerProfileRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  KangurParentDashboardRuntimeBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./KangurCmsRuntimeDataProvider', () => ({
  KangurCmsRuntimeDataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('KangurCmsRuntimeScreen', () => {
  beforeEach(() => {
    rawProjectRef.current = undefined;
  });

  it('renders the runtime screen when the project arrives after the first render', () => {
    const { rerender } = render(
      <KangurCmsRuntimeScreen pageKey='Lessons' fallback={<div data-testid='fallback'>fallback</div>} />
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('cms-runtime-page-renderer')).toBeNull();

    rawProjectRef.current = serializeSetting(createDefaultKangurCmsProject('pl'));
    rerender(
      <KangurCmsRuntimeScreen pageKey='Lessons' fallback={<div data-testid='fallback'>fallback</div>} />
    );

    expect(screen.queryByTestId('fallback')).toBeNull();
    expect(screen.getByTestId('cms-runtime-page-renderer')).toBeInTheDocument();
  });
});
