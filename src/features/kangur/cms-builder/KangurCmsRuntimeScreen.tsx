'use client';

import { useMemo } from 'react';

import {
  CmsRuntimePageRenderer,
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/public';
import { KangurGameRuntimeBoundary } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurLearnerProfileRuntimeBoundary } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurLessonsRuntimeBoundary } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurParentDashboardRuntimeBoundary } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { buildColorSchemeMap, normalizeThemeSettings } from '@/shared/contracts/cms-theme';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import { KangurCmsRuntimeDataProvider } from './KangurCmsRuntimeDataProvider';
import {
  KANGUR_CMS_PROJECT_SETTING_KEY,
  KANGUR_CMS_THEME_SETTINGS_KEY,
  parseKangurCmsProject,
  resolveKangurCmsScreenKey,
} from './project';

import type { CSSProperties, ReactNode } from 'react';

const buildThemeVars = (theme: ThemeSettings): CSSProperties => ({
  ['--cms-font-heading' as keyof CSSProperties]: theme.headingFont,
  ['--cms-font-body' as keyof CSSProperties]: theme.bodyFont,
  ['--cms-font-base-size' as keyof CSSProperties]: `${theme.baseSize}px`,
  ['--cms-font-heading-weight' as keyof CSSProperties]: String(theme.headingWeight),
  ['--cms-font-body-weight' as keyof CSSProperties]: String(theme.bodyWeight),
  ['--cms-color-primary' as keyof CSSProperties]: theme.primaryColor,
  ['--cms-color-secondary' as keyof CSSProperties]: theme.secondaryColor,
  ['--cms-color-accent' as keyof CSSProperties]: theme.accentColor,
  ['--cms-color-background' as keyof CSSProperties]: theme.backgroundColor,
  ['--cms-color-surface' as keyof CSSProperties]: theme.surfaceColor,
  ['--cms-color-text' as keyof CSSProperties]: theme.textColor,
  ['--cms-color-muted' as keyof CSSProperties]: theme.mutedTextColor,
});

const buildCanvasStyles = (
  theme: ThemeSettings
): {
  shellStyle: CSSProperties;
  contentStyle: CSSProperties;
} => {
  const basePadding = typeof theme.pagePadding === 'number' ? theme.pagePadding : 0;
  const baseMargin = typeof theme.pageMargin === 'number' ? theme.pageMargin : 0;
  const paddingTop = typeof theme.pagePaddingTop === 'number' ? theme.pagePaddingTop : basePadding;
  const paddingRight =
    typeof theme.pagePaddingRight === 'number' ? theme.pagePaddingRight : basePadding;
  const paddingBottom =
    typeof theme.pagePaddingBottom === 'number' ? theme.pagePaddingBottom : basePadding;
  const paddingLeft =
    typeof theme.pagePaddingLeft === 'number' ? theme.pagePaddingLeft : basePadding;
  const marginTop = typeof theme.pageMarginTop === 'number' ? theme.pageMarginTop : baseMargin;
  const marginRight =
    typeof theme.pageMarginRight === 'number' ? theme.pageMarginRight : baseMargin;
  const marginBottom =
    typeof theme.pageMarginBottom === 'number' ? theme.pageMarginBottom : baseMargin;
  const marginLeft = typeof theme.pageMarginLeft === 'number' ? theme.pageMarginLeft : baseMargin;
  const pageRadius = typeof theme.borderRadius === 'number' ? theme.borderRadius : 0;

  return {
    shellStyle: {
      backgroundColor: theme.backgroundColor,
      color: theme.textColor,
      fontFamily: theme.bodyFont,
      fontSize: `${theme.baseSize}px`,
      lineHeight: theme.lineHeight,
      minHeight: '100%',
      borderRadius: pageRadius > 0 ? pageRadius : undefined,
      overflow: pageRadius > 0 ? 'hidden' : undefined,
    },
    contentStyle: {
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
    },
  };
};

export function KangurCmsRuntimeScreen({
  pageKey,
  fallback = null,
}: {
  pageKey: string | null | undefined;
  fallback?: ReactNode;
}): ReactNode {
  const settingsStore = useSettingsStore();
  const rawProject = settingsStore.get(KANGUR_CMS_PROJECT_SETTING_KEY);
  const rawTheme = settingsStore.get(KANGUR_CMS_THEME_SETTINGS_KEY);
  const screenKey = resolveKangurCmsScreenKey(pageKey);

  const project = useMemo(
    () => parseKangurCmsProject(rawProject, { fallbackToDefault: false }),
    [rawProject]
  );
  const theme = useMemo(() => {
    const stored = parseJsonSetting<Partial<ThemeSettings> | null>(rawTheme, null);
    return normalizeThemeSettings(stored);
  }, [rawTheme]);

  const screen = screenKey ? project?.screens[screenKey] ?? null : null;
  const colorSchemes = useMemo(
    () => (theme.colorSchemes.length > 0 ? buildColorSchemeMap(theme) : undefined),
    [theme]
  );
  const mediaStyles = useMemo(() => getMediaInlineStyles(theme), [theme]);
  const themeVars = useMemo(() => buildThemeVars(theme), [theme]);
  const { shellStyle, contentStyle } = useMemo(() => buildCanvasStyles(theme), [theme]);

  if (!screen) {
    return fallback;
  }

  return (
    <div style={{ ...themeVars, ...shellStyle, ...getMediaStyleVars(theme) }}>
      {theme.customCss?.trim() ? <style>{theme.customCss}</style> : null}
      <div style={contentStyle}>
        <KangurGameRuntimeBoundary enabled={screenKey === 'Game'}>
          <KangurLessonsRuntimeBoundary enabled={screenKey === 'Lessons'}>
            <KangurLearnerProfileRuntimeBoundary enabled={screenKey === 'LearnerProfile'}>
              <KangurParentDashboardRuntimeBoundary enabled={screenKey === 'ParentDashboard'}>
                <KangurCmsRuntimeDataProvider>
                  <CmsRuntimePageRenderer
                    components={screen.components}
                    colorSchemes={colorSchemes}
                    layout={{ fullWidth: theme.fullWidth }}
                    hoverEffect={theme.enableAnimations ? theme.hoverEffect : undefined}
                    hoverScale={theme.enableAnimations ? theme.hoverScale : undefined}
                    mediaStyles={mediaStyles}
                  />
                </KangurCmsRuntimeDataProvider>
              </KangurParentDashboardRuntimeBoundary>
            </KangurLearnerProfileRuntimeBoundary>
          </KangurLessonsRuntimeBoundary>
        </KangurGameRuntimeBoundary>
      </div>
    </div>
  );
}
