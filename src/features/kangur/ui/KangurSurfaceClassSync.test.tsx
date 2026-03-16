import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { KANGUR_CLASS_OVERRIDES_SETTING_KEY } from '@/features/kangur/class-overrides';
import { KANGUR_THEME_SETTINGS_KEY } from '@/features/kangur/theme-settings';
import { KangurSurfaceClassSync } from '@/features/kangur/ui/KangurSurfaceClassSync';
import { DEFAULT_THEME } from '@/shared/contracts/cms-theme';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

const settingsStoreMock = vi.hoisted(() => ({
  get: vi.fn<(key: string) => string | undefined>(),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => settingsStoreMock,
  };
});

describe('KangurSurfaceClassSync', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '';
    settingsStoreMock.get.mockReset();
    settingsStoreMock.get.mockReturnValue(undefined);
    const appContent = document.createElement('main');
    appContent.id = 'app-content';
    document.body.appendChild(appContent);
  });

  it('applies the Kangur surface class to the page chrome while mounted', () => {
    const appContent = document.getElementById('app-content');
    expect(appContent).not.toBeNull();

    const { unmount } = render(
      <KangurSurfaceClassSync>
        <div>Surface</div>
      </KangurSurfaceClassSync>
    );

    expect(document.documentElement).toHaveClass('kangur-surface-active');
    expect(document.body).toHaveClass('kangur-surface-active');
    expect(appContent).toHaveClass('kangur-surface-active');
    expect(document.documentElement).toHaveAttribute('data-kangur-appearance-mode', 'default');
    expect(document.body).toHaveAttribute('data-kangur-appearance-mode', 'default');
    expect(appContent).toHaveAttribute('data-kangur-appearance-mode', 'default');
    expect(document.documentElement).toHaveStyle({ scrollbarGutter: 'stable' });
    expect(document.body).toHaveStyle({ scrollbarGutter: 'stable' });
    expect(appContent).toHaveStyle({ scrollbarGutter: 'stable' });

    unmount();

    expect(document.documentElement).not.toHaveClass('kangur-surface-active');
    expect(document.body).not.toHaveClass('kangur-surface-active');
    expect(appContent).not.toHaveClass('kangur-surface-active');
    expect(document.documentElement).not.toHaveAttribute('data-kangur-appearance-mode');
    expect(document.body).not.toHaveAttribute('data-kangur-appearance-mode');
    expect(appContent).not.toHaveAttribute('data-kangur-appearance-mode');
    expect(document.documentElement.style.getPropertyValue('scrollbar-gutter')).toBe('');
    expect(document.body.style.getPropertyValue('scrollbar-gutter')).toBe('');
    expect(appContent?.style.getPropertyValue('scrollbar-gutter')).toBe('');
  });

  it('applies the selected storefront appearance background to the page chrome', async () => {
    render(
      <CmsStorefrontAppearanceProvider initialMode='dark'>
        <KangurSurfaceClassSync>
          <div>Surface</div>
        </KangurSurfaceClassSync>
      </CmsStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(document.body.style.getPropertyValue('background')).toContain('color-mix');
    });
    expect(document.body).toHaveAttribute('data-kangur-appearance-mode', 'dark');
    expect(document.body.style.getPropertyValue('--kangur-soft-card-background')).toContain(
      'color-mix'
    );
    expect(document.body.style.getPropertyValue('--kangur-button-surface-hover-background')).toContain(
      'linear-gradient'
    );
  });

  it('applies stored class overrides to the Kangur surface targets', () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key !== KANGUR_CLASS_OVERRIDES_SETTING_KEY) {
        return undefined;
      }

      return serializeSetting({
        version: 1,
        globals: {
          html: 'kangur-html-override',
          body: 'kangur-body-override',
          app: 'kangur-app-override',
          shell: '',
        },
        components: {},
      });
    });

    const appContent = document.getElementById('app-content');
    expect(appContent).not.toBeNull();

    const { unmount } = render(
      <KangurSurfaceClassSync>
        <div>Surface</div>
      </KangurSurfaceClassSync>
    );

    expect(document.documentElement).toHaveClass('kangur-html-override');
    expect(document.body).toHaveClass('kangur-body-override');
    expect(appContent).toHaveClass('kangur-app-override');

    unmount();

    expect(document.documentElement).not.toHaveClass('kangur-html-override');
    expect(document.body).not.toHaveClass('kangur-body-override');
    expect(appContent).not.toHaveClass('kangur-app-override');
  });

  it('applies a stored Kangur theme document to the page chrome', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key !== KANGUR_THEME_SETTINGS_KEY) {
        return undefined;
      }

      return serializeSetting({
        ...DEFAULT_THEME,
        backgroundColor: '#fff7ed',
        surfaceColor: '#ffffff',
        textColor: '#4c1d95',
        mutedTextColor: '#9a3412',
        borderColor: '#fdba74',
        accentColor: '#f97316',
        primaryColor: '#7c3aed',
        secondaryColor: '#ec4899',
        btnPrimaryBg: '#f97316',
        btnSecondaryBg: '#ffedd5',
        btnSecondaryText: '#9a3412',
        inputBg: '#ffffff',
        inputText: '#4c1d95',
        inputBorderColor: '#fdba74',
        inputPlaceholder: '#c2410c',
        headingFont: 'Outfit, sans-serif',
        bodyFont: 'Manrope, sans-serif',
        maxContentWidth: 1500,
        gridGutter: 30,
        pagePaddingTop: 44,
        pagePaddingRight: 34,
        pagePaddingBottom: 86,
        pagePaddingLeft: 28,
        containerRadius: 30,
        containerPaddingInner: 28,
        cardRadius: 24,
        btnPaddingX: 22,
        btnPaddingY: 11,
        btnFontSize: 15,
        btnRadius: 28,
        pillRadius: 18,
        pillPaddingX: 18,
        pillPaddingY: 11,
        pillFontSize: 15,
        inputHeight: 54,
        inputRadius: 16,
        inputFontSize: 15,
        containerBg: '#ffffff',
        containerBorderColor: '#fed7aa',
        cardBg: '#ffffff',
        pillBg: '#fff7ed',
        pillText: '#c2410c',
        pillActiveBg: '#f97316',
        pillActiveText: '#ffffff',
      });
    });

    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurSurfaceClassSync>
          <div>Surface</div>
        </KangurSurfaceClassSync>
      </CmsStorefrontAppearanceProvider>
    );

    await waitFor(() => {
      expect(document.body.style.getPropertyValue('--kangur-page-text')).toBe('#4c1d95');
    });
    expect(document.body.style.getPropertyValue('--kangur-button-primary-background')).toContain(
      '#f97316'
    );
    expect(document.body.style.getPropertyValue('--kangur-font-heading')).toBe(
      'Outfit, sans-serif'
    );
    expect(document.body.style.getPropertyValue('--kangur-font-body')).toBe('Manrope, sans-serif');
    expect(document.body.style.getPropertyValue('--kangur-page-max-width')).toBe('1500px');
    expect(document.body.style.getPropertyValue('--kangur-page-padding-top')).toBe('44px');
    expect(document.body.style.getPropertyValue('--kangur-page-padding-right')).toBe('34px');
    expect(document.body.style.getPropertyValue('--kangur-page-padding-bottom')).toBe('86px');
    expect(document.body.style.getPropertyValue('--kangur-page-padding-left')).toBe('28px');
    expect(document.body.style.getPropertyValue('--kangur-grid-gutter')).toBe('30px');
    expect(document.body.style.getPropertyValue('--kangur-panel-radius-subtle')).toBe('30px');
    expect(document.body.style.getPropertyValue('--kangur-card-radius')).toBe('24px');
    expect(document.body.style.getPropertyValue('--kangur-lesson-callout-radius')).toBe('22px');
    expect(document.body.style.getPropertyValue('--kangur-lesson-inset-radius')).toBe('16px');
    expect(document.body.style.getPropertyValue('--kangur-gradient-icon-tile-radius-md')).toBe(
      '14px'
    );
    expect(document.body.style.getPropertyValue('--kangur-gradient-icon-tile-radius-lg')).toBe(
      '22px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-bubble-radius')).toBe('20px');
    expect(document.body.style.getPropertyValue('--kangur-chat-card-radius')).toBe('20px');
    expect(document.body.style.getPropertyValue('--kangur-chat-inset-radius')).toBe('18px');
    expect(document.body.style.getPropertyValue('--kangur-chat-panel-radius-minimal')).toBe(
      '26px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-panel-radius-compact')).toBe(
      '22px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-spotlight-radius-sm')).toBe(
      '16px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-spotlight-radius-md')).toBe(
      '20px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-padding-x-sm')).toBe('16px');
    expect(document.body.style.getPropertyValue('--kangur-chat-padding-y-sm')).toBe('12px');
    expect(document.body.style.getPropertyValue('--kangur-chat-padding-x-lg')).toBe('20px');
    expect(document.body.style.getPropertyValue('--kangur-chat-padding-y-lg')).toBe('16px');
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-x-sm')).toBe(
      '16px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-y-sm')).toBe(
      '14px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-x-md')).toBe(
      '16px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-y-md')).toBe(
      '14px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-x-lg')).toBe(
      '20px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-header-padding-y-lg')).toBe(
      '16px'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-spotlight-border')).toContain(
      '#f97316'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-avatar-shell-background')).toContain(
      'rgba(255,255,255,0.18)'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-avatar-shell-border')).toContain(
      'rgba(255,255,255,0.35)'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-pointer-marker')).toContain(
      '#f97316'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-tail-background')).toContain(
      'var(--kangur-soft-card-background)'
    );
    expect(document.body.style.getPropertyValue('--kangur-chat-sheet-handle-background')).toContain(
      '#f97316'
    );
    expect(document.body.style.getPropertyValue('--kangur-panel-padding-md')).toBe('24px');
    expect(document.body.style.getPropertyValue('--kangur-card-padding-md')).toBe('20px');
    expect(document.body.style.getPropertyValue('--kangur-stack-gap-md')).toBe('20px');
    expect(document.body.style.getPropertyValue('--kangur-button-padding-x')).toBe('22px');
    expect(document.body.style.getPropertyValue('--kangur-button-padding-y')).toBe('11px');
    expect(document.body.style.getPropertyValue('--kangur-button-font-size')).toBe('15px');
    expect(document.body.style.getPropertyValue('--kangur-button-height')).toBe('53px');
    expect(document.body.style.getPropertyValue('--kangur-button-radius')).toBe('28px');
    expect(document.body.style.getPropertyValue('--kangur-nav-item-radius')).toBe('18px');
    expect(document.body.style.getPropertyValue('--kangur-menu-item-radius')).toBe('14px');
    expect(document.body.style.getPropertyValue('--kangur-pill-padding-x')).toBe('18px');
    expect(document.body.style.getPropertyValue('--kangur-pill-padding-y')).toBe('11px');
    expect(document.body.style.getPropertyValue('--kangur-pill-font-size')).toBe('15px');
    expect(document.body.style.getPropertyValue('--kangur-text-field-border')).toContain(
      '#fdba74'
    );
    expect(document.body.style.getPropertyValue('--kangur-input-height')).toBe('54px');
    expect(document.body.style.getPropertyValue('--kangur-input-radius')).toBe('16px');
    expect(document.body.style.getPropertyValue('--kangur-input-font-size')).toBe('15px');
  });
});
