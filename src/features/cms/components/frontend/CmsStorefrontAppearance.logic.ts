import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { darkenCssColor } from '@/shared/utils/color-utils';
import {
  CmsStorefrontAppearanceMode,
  CmsAppearanceTone,
} from './CmsStorefrontAppearance.contracts';
import {
  applyTransparency,
  buildShadow,
  clampNumber,
  extractGradientStops,
  isGradientValue,
  isNonEmptyString,
  isDarkStorefrontAppearanceMode,
  mixCssColor,
  resolveBackgroundValue,
  resolveSolidColor,
  toCssPx,
} from './CmsStorefrontAppearance.utils';
import { resolveHomeActionVars } from './CmsStorefrontAppearance.home-actions';
import {
  buildGelButtonShadow,
  resolveButtonTextShadow,
  resolveStorefrontAppearanceColorSchemes,
  resolveStorefrontAppearanceTone,
} from './appearance-logic/CmsStorefrontAppearance.color-resolvers';
import { resolveKangurRuntimeThemeVars } from './appearance-logic/CmsStorefrontAppearance.runtime-vars';
import { resolveDefaultKangurStorefrontAppearance } from './appearance-logic/CmsStorefrontAppearance.default-vars';

const resolveThemedKangurStorefrontAppearance = (
  theme: ThemeSettings,
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const accent = theme.accentColor || theme.primaryColor || theme.secondaryColor || theme.textColor;
  const isDark = isDarkStorefrontAppearanceMode(mode);
  const primary = theme.primaryColor || accent;
  const secondary = theme.secondaryColor || primary;
  const infoBackground = secondary;
  const surfaceBackground = theme.cardBg || theme.containerBg || theme.surfaceColor;
  const borderColor =
    theme.containerBorderColor || theme.borderColor || theme.inputBorderColor || theme.btnOutlineBorder;
  const inputBackground = theme.inputBg || surfaceBackground;
  const inputText = theme.inputText || theme.textColor;
  const inputBorderColor = theme.inputBorderColor || borderColor;
  const navBackground = theme.pillBg || surfaceBackground;
  const navText = theme.pillText || theme.mutedTextColor;
  const navActiveBackground = theme.pillActiveBg || primary;
  const navActiveText = theme.pillActiveText || theme.btnPrimaryText || '#ffffff';
  const primaryButtonText = isDark
    ? mixCssColor(theme.btnPrimaryText || '#ffffff', '#ffffff', 92)
    : theme.btnPrimaryText || '#ffffff';
  const buttonTextShadow = resolveButtonTextShadow(theme, isDark);
  const buttonGlossOpacity = clampNumber(theme.btnGlossOpacity, 0, 1) * (isDark ? 0.65 : 1);
  const buttonGlossHeight = `${clampNumber(theme.btnGlossHeight, 0, 100)}%`;
  const buttonGlossAngle = `${clampNumber(theme.btnGlossAngle, 0, 360)}deg`;
  const buttonGlossColor = isNonEmptyString(theme.btnGlossColor) ? theme.btnGlossColor.trim() : '#ffffff';
  const buttonBorderOpacity = clampNumber(theme.btnBorderOpacity, 0, 100) / 100;
  const buttonBorderColor = applyTransparency(
    isNonEmptyString(theme.btnOutlineBorder) ? theme.btnOutlineBorder.trim() : borderColor,
    buttonBorderOpacity
  );
  const buttonBorderWidth = toCssPx(theme.btnBorderWidth);
  const buttonBorderRadius = toCssPx(theme.btnBorderRadius);
  const primaryButtonBase = resolveSolidColor(theme.btnPrimaryBg, primary);
  const secondaryButtonBase = resolveSolidColor(theme.btnSecondaryBg, surfaceBackground);
  const warningBackground = theme.accentColor || accent;
  const successBackground = theme.successColor || '#22c55e';
  const chatBackground = theme.containerBg || surfaceBackground;
  const runtimeThemeVars = resolveKangurRuntimeThemeVars(theme);
  const homeActionVars = resolveHomeActionVars(theme);
  const baseToneText = isDarkStorefrontAppearanceMode(mode) ? '#f8fafc' : theme.textColor;
  const baseMutedText = isDarkStorefrontAppearanceMode(mode)
    ? mixCssColor(theme.mutedTextColor, '#ffffff', 72)
    : theme.mutedTextColor;
  const resolveTextOverride = (value: string | undefined, fallback: string): string =>
    isNonEmptyString(value) ? value.trim() : fallback;
  const toneText = resolveTextOverride(theme.pageTextColor, baseToneText);
  const pageMutedText = resolveTextOverride(theme.pageMutedTextColor, baseMutedText);
  const cardText = resolveTextOverride(theme.cardTextColor, toneText);
  const navTextOverride = isNonEmptyString(theme.navTextColor)
    ? theme.navTextColor.trim()
    : null;
  const navActiveTextOverride = isNonEmptyString(theme.navActiveTextColor)
    ? theme.navActiveTextColor.trim()
    : null;
  const navHoverTextOverride = isNonEmptyString(theme.navHoverTextColor)
    ? theme.navHoverTextColor.trim()
    : null;
  const pageTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: theme.backgroundColor,
            text: theme.textColor,
            border: borderColor,
            accent,
          },
          mode
        )
      : {
          background: theme.backgroundColor,
          text: toneText,
          border: borderColor,
          accent,
        };
  const surfaceTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: surfaceBackground,
            text: theme.textColor,
            border: borderColor,
            accent,
          },
          mode
        )
      : {
          background: surfaceBackground,
          text: toneText,
          border: borderColor,
          accent,
        };
  const inputTone =
    isDarkStorefrontAppearanceMode(mode)
      ? resolveStorefrontAppearanceTone(
          {
            background: inputBackground,
            text: inputText,
            border: inputBorderColor,
            accent,
          },
          mode
        )
      : {
          background: inputBackground,
          text: inputText,
          border: inputBorderColor,
          accent,
        };
  const background =
    isDarkStorefrontAppearanceMode(mode)
      ? `radial-gradient(circle at top, ${mixCssColor(primary, theme.backgroundColor, 18)} 0%, ${mixCssColor(theme.surfaceColor, theme.backgroundColor, 64)} 44%, ${darkenCssColor(theme.backgroundColor, 22)} 100%)`
      : `radial-gradient(circle at top, ${mixCssColor(accent, theme.backgroundColor, 12)} 0%, ${mixCssColor(theme.surfaceColor, theme.backgroundColor, 52)} 48%, ${mixCssColor(secondary, theme.backgroundColor, 10)} 100%)`;
  const softSurfaceStart = mixCssColor(
    surfaceTone.background,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 92 : 92
  );
  const softSurfaceEnd = mixCssColor(
    surfaceTone.background,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 86 : 84
  );
  const warmSurfaceStart = mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 90 : 92
  );
  const warmSurfaceEnd = mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 84 : 86
  );
  const infoSurfaceStart = mixCssColor(
    surfaceTone.background,
    infoBackground,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 90
  );
  const infoSurfaceEnd = mixCssColor(
    surfaceTone.background,
    infoBackground,
    isDarkStorefrontAppearanceMode(mode) ? 82 : 86
  );
  const successSurface = mixCssColor(
    surfaceTone.background,
    successBackground,
    isDarkStorefrontAppearanceMode(mode) ? 86 : 82
  );
  const dividerColor = mixCssColor(borderColor, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 68 : 74);
  const softSurfaceShadow =
    isDarkStorefrontAppearanceMode(mode)
      ? `0 12px 28px -18px ${mixCssColor(theme.backgroundColor, '#000000', 60)}`
      : `0 12px 28px -18px ${mixCssColor(theme.backgroundColor, '#000000', 18)}`;
  const warmSurfaceShadow = `0 8px 18px -12px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 54 : 24
  )}`;
  const infoSurfaceShadow = `0 8px 18px -12px ${mixCssColor(
    infoBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 54 : 24
  )}`;
  const successSurfaceShadow = `0 6px 16px -10px ${mixCssColor(
    successBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 52 : 22
  )}`;
  const composerBackground = `linear-gradient(180deg, ${mixCssColor(
    surfaceTone.background,
    'transparent',
    isDarkStorefrontAppearanceMode(mode) ? 92 : 88
  )} 0%, transparent 100%)`;
  const selectionBadgeBackground = `color-mix(in srgb, ${surfaceTone.background} ${
    isDarkStorefrontAppearanceMode(mode) ? 28 : 18
  }%, rgba(255,255,255,${isDarkStorefrontAppearanceMode(mode) ? '0.14' : '0.16'}))`;
  const backdropBase = '#0f172a';
  const backdrop = `color-mix(in srgb, ${backdropBase} ${isDarkStorefrontAppearanceMode(mode) ? 28 : 18}%, transparent)`;
  const backdropStrong = `color-mix(in srgb, ${backdropBase} ${isDarkStorefrontAppearanceMode(mode) ? 44 : 32}%, transparent)`;
  const panelSnapRing = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  );
  const panelSnapShadow = `0 0 0 1px ${mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 26 : 22
  )}, 0 28px 56px -28px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 72 : 46
  )}, inset 0 1px 0 ${mixCssColor('#ffffff', '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 16 : 60)}`;
  const warmOverlayBackground = `radial-gradient(circle at top, ${mixCssColor(
    surfaceTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 26 : 22
  )} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 76 : 64)} 44%, ${mixCssColor(
    pageTone.background,
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? 8 : 12
  )} 100%)`;
  const warmOverlayBorder = mixCssColor(borderColor, warningBackground, isDarkStorefrontAppearanceMode(mode) ? 54 : 60);
  const warmOverlayInset =
    isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)';
  const warmOverlayShadowCallout = `0 20px 48px -30px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  )}, inset 0 1px 0 ${warmOverlayInset}`;
  const warmOverlayShadowModal = `0 26px 60px -34px ${mixCssColor(
    warningBackground,
    '#000000',
    isDarkStorefrontAppearanceMode(mode) ? 60 : 34
  )}, inset 0 1px 0 ${warmOverlayInset}`;
  const panelTransparency = clampNumber(theme.panelTransparency ?? 1, 0, 1);
  const navTransparency = clampNumber(theme.navTransparency ?? 1, 0, 1);
  const panelGradientStart = theme.panelGradientStart?.trim()
    ? theme.panelGradientStart
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(surfaceTone.background, '#000000', 80)
      : mixCssColor(surfaceTone.background, '#ffffff', 86);
  const panelGradientEnd = theme.panelGradientEnd?.trim()
    ? theme.panelGradientEnd
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(surfaceTone.background, pageTone.background, 86)
      : mixCssColor(surfaceTone.background, pageTone.background, 92);
  const navGradientStart = theme.navGradientStart?.trim()
    ? theme.navGradientStart
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(navBackground, '#000000', 84)
      : mixCssColor(navBackground, '#ffffff', 90);
  const navGradientEnd = theme.navGradientEnd?.trim()
    ? theme.navGradientEnd
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(navBackground, pageTone.background, 88)
      : mixCssColor(navBackground, pageTone.background, 86);
  const panelGradientStartWithAlpha = applyTransparency(panelGradientStart, panelTransparency);
  const panelGradientEndWithAlpha = applyTransparency(panelGradientEnd, panelTransparency);
  const navGradientStartWithAlpha = applyTransparency(navGradientStart, navTransparency);
  const navGradientEndWithAlpha = applyTransparency(navGradientEnd, navTransparency);
  const panelShadowBase =
    isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(theme.backgroundColor, '#000000', 42)
      : mixCssColor(primary, '#000000', 18);
  const cardShadowBase =
    isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(theme.backgroundColor, '#000000', 34)
      : mixCssColor(primary, '#000000', 12);
  const progressTrack = theme.progressTrackColor?.trim()
    ? theme.progressTrackColor
    : isDarkStorefrontAppearanceMode(mode)
      ? mixCssColor(borderColor, pageTone.background, 48)
      : mixCssColor(borderColor, pageTone.background, 64);
  const glassPanelShadow = buildShadow({
    x: theme.containerShadowX,
    y: theme.containerShadowY,
    blur: theme.containerShadowBlur,
    color: panelShadowBase,
    opacity: theme.containerShadowOpacity,
  });
  const softCardShadow = buildShadow({
    x: theme.cardShadowX,
    y: theme.cardShadowY,
    blur: theme.cardShadowBlur,
    color: cardShadowBase,
    opacity: theme.cardShadowOpacity,
  });
  const primaryButtonBackgroundComputed = `linear-gradient(90deg, ${mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 82 : 68
  )} 0%, ${darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 18 : 8)} 100%)`;
  const primaryButtonHoverBackgroundComputed = `linear-gradient(90deg, ${mixCssColor(
    primaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 58
  )} 0%, ${darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 10 : 2)} 56%, ${darkenCssColor(
    primaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? 20 : 10
  )} 100%)`;
  const secondaryButtonBackgroundComputed = `linear-gradient(180deg, ${mixCssColor(
    secondaryButtonBase,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 88 : 92
  )} 0%, ${mixCssColor(
    secondaryButtonBase,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 92 : 84
  )} 100%)`;
  const secondaryButtonHoverBackgroundComputed = `linear-gradient(180deg, ${mixCssColor(
    secondaryButtonBase,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 78 : 86
  )} 0%, ${mixCssColor(
    secondaryButtonBase,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 80
  )} 100%)`;
  const primaryButtonBackground = resolveBackgroundValue(
    theme.btnPrimaryBg,
    primaryButtonBackgroundComputed
  );
  const primaryButtonHoverBackground = resolveBackgroundValue(
    theme.btnPrimaryBg,
    primaryButtonHoverBackgroundComputed
  );
  const secondaryButtonBackground = resolveBackgroundValue(
    theme.btnSecondaryBg,
    secondaryButtonBackgroundComputed
  );
  const secondaryButtonHoverBackground = resolveBackgroundValue(
    theme.btnSecondaryBg,
    secondaryButtonHoverBackgroundComputed
  );
  const gradientSoftMid = mixCssColor(
    surfaceTone.background,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 24 : 92
  );
  const primaryGradientStops = isGradientValue(theme.btnPrimaryBg)
    ? extractGradientStops(theme.btnPrimaryBg)
    : [];
  const hasPrimaryGradientStops = primaryGradientStops.length >= 2;
  const primaryGradientStopBase = primaryGradientStops[0] ?? primaryButtonBase;
  const primaryGradientStopStart = hasPrimaryGradientStops ? primaryGradientStopBase : null;
  const primaryGradientStopEnd = hasPrimaryGradientStops
    ? primaryGradientStops[primaryGradientStops.length - 1] ?? primaryGradientStopBase
    : null;
  const primaryGradientStopMid = hasPrimaryGradientStops
    ? primaryGradientStops[1] ??
      mixCssColor(primaryGradientStopBase, primaryGradientStopEnd ?? primaryGradientStopBase, 50)
    : null;
  const primaryGradientStart =
    primaryGradientStopStart ??
    mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 68);
  const primaryGradientMid =
    primaryGradientStopMid ??
    mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 58);
  const primaryGradientEnd =
    primaryGradientStopEnd ??
    darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 18 : 8);
  const primaryGradientHoverStart = hasPrimaryGradientStops
    ? mixCssColor(primaryGradientStart, '#ffffff', isDark ? 74 : 82)
    : mixCssColor(primaryButtonBase, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 58);
  const primaryGradientHoverMid = hasPrimaryGradientStops
    ? mixCssColor(primaryGradientMid, '#ffffff', isDark ? 70 : 78)
    : darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 10 : 2);
  const primaryGradientHoverEnd = hasPrimaryGradientStops
    ? darkenCssColor(primaryGradientEnd, isDark ? 8 : 6)
    : darkenCssColor(primaryButtonBase, isDarkStorefrontAppearanceMode(mode) ? 20 : 10);
  const primaryGradientActiveStart = darkenCssColor(primaryGradientStart, isDark ? 10 : 6);
  const primaryGradientActiveMid = darkenCssColor(primaryGradientMid, isDark ? 10 : 6);
  const primaryGradientActiveEnd = darkenCssColor(primaryGradientEnd, isDark ? 12 : 8);
  const warningGradientStart = mixCssColor(
    warningBackground,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 84 : 76
  );
  const warningGradientEnd = mixCssColor(
    warningBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 88 : 68
  );
  const warningGradientHoverStart = mixCssColor(
    warningBackground,
    '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 74 : 68
  );
  const warningGradientHoverEnd = mixCssColor(
    warningBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 82 : 62
  );
  const successGradientStart = mixCssColor(
    successBackground,
    isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff',
    isDarkStorefrontAppearanceMode(mode) ? 86 : 78
  );
  const successGradientEnd = mixCssColor(
    successBackground,
    pageTone.background,
    isDarkStorefrontAppearanceMode(mode) ? 90 : 70
  );
  const primaryButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -18px ${mixCssColor(primaryButtonBase, '#000000', isDark ? 36 : 24)}`],
    theme,
    primaryButtonBase,
    isDark
  );
  const secondaryButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -20px ${mixCssColor(secondaryButtonBase, '#000000', isDark ? 46 : 24)}`],
    theme,
    secondaryButtonBase,
    isDark
  );
  const surfaceButtonActiveShadow = buildGelButtonShadow(
    [`0 10px 18px -20px ${mixCssColor(primary, '#000000', isDark ? 28 : 18)}`],
    theme,
    primary,
    isDark
  );
  const resolveLogoOverride = (value: string | undefined, fallback: string): string =>
    isNonEmptyString(value) ? value.trim() : fallback;
  const logoWordStart = resolveLogoOverride(theme.logoWordStart, primary);
  const logoWordMid = resolveLogoOverride(theme.logoWordMid, mixCssColor(primary, secondary, 60));
  const logoWordEnd = resolveLogoOverride(theme.logoWordEnd, secondary);
  const logoRingStart = resolveLogoOverride(
    theme.logoRingStart,
    mixCssColor(primary, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 70 : 82)
  );
  const logoRingEnd = resolveLogoOverride(
    theme.logoRingEnd,
    mixCssColor(secondary, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 68 : 80)
  );
  const logoAccentStart = resolveLogoOverride(
    theme.logoAccentStart,
    mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 70 : 86)
  );
  const logoAccentEnd = resolveLogoOverride(
    theme.logoAccentEnd,
    mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 30 : 12)
  );
  const logoInnerStart = resolveLogoOverride(
    theme.logoInnerStart,
    mixCssColor(surfaceTone.background, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 24 : 94)
  );
  const logoInnerEnd = resolveLogoOverride(
    theme.logoInnerEnd,
    mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 40 : 86)
  );
  const logoShadow = resolveLogoOverride(
    theme.logoShadow,
    darkenCssColor(primary, isDarkStorefrontAppearanceMode(mode) ? 48 : 20)
  );
  const logoGlint = resolveLogoOverride(
    theme.logoGlint,
    mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 92)
  );

  return {
    background,
    tone: {
      background: pageTone.background,
      text: toneText,
      border: pageTone.border,
      accent,
    },
    vars: {
      ...runtimeThemeVars,
      ...homeActionVars,
      '--kangur-page-background': background,
      '--kangur-logo-word-start': logoWordStart,
      '--kangur-logo-word-mid': logoWordMid,
      '--kangur-logo-word-end': logoWordEnd,
      '--kangur-logo-ring-start': logoRingStart,
      '--kangur-logo-ring-end': logoRingEnd,
      '--kangur-logo-accent-start': logoAccentStart,
      '--kangur-logo-accent-end': logoAccentEnd,
      '--kangur-logo-inner-start': logoInnerStart,
      '--kangur-logo-inner-end': logoInnerEnd,
      '--kangur-logo-shadow': logoShadow,
      '--kangur-logo-glint': logoGlint,
      '--kangur-glass-panel-background': `linear-gradient(180deg, ${panelGradientStartWithAlpha} 0%, ${panelGradientEndWithAlpha} 100%)`,
      '--kangur-glass-panel-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 34)
          : mixCssColor(borderColor, '#ffffff', 74),
      '--kangur-glass-panel-shadow': glassPanelShadow,
      '--kangur-soft-card-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(surfaceTone.background, pageTone.background, 90)
          : mixCssColor(surfaceTone.background, '#ffffff', 94),
      '--kangur-soft-card-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 28)
          : darkenCssColor(borderColor, 4),
      '--kangur-soft-card-shadow': softCardShadow,
      '--kangur-soft-card-text': cardText,
      '--kangur-nav-group-background': `linear-gradient(180deg, ${navGradientStartWithAlpha} 0%, ${navGradientEndWithAlpha} 100%)`,
      '--kangur-nav-group-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 34)
          : mixCssColor(borderColor, '#ffffff', 72),
      '--kangur-nav-item-text':
        navTextOverride ??
        (isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navText, '#ffffff', 84)
          : navText),
      '--kangur-nav-item-hover-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navBackground, pageTone.background, 76)
          : mixCssColor(navBackground, '#ffffff', 94),
      '--kangur-nav-item-hover-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(borderColor, '#ffffff', 40)
          : mixCssColor(borderColor, '#ffffff', 76),
      '--kangur-nav-item-hover-text': navHoverTextOverride ?? toneText,
      '--kangur-nav-item-active-background':
        `linear-gradient(180deg, ${mixCssColor(navActiveBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 88 : 72)} 0%, ${darkenCssColor(navActiveBackground, isDarkStorefrontAppearanceMode(mode) ? 22 : 8)} 100%)`,
      '--kangur-nav-item-active-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navActiveBackground, '#ffffff', 38)
          : mixCssColor(navActiveBackground, '#ffffff', 56),
      '--kangur-nav-item-active-text':
        navActiveTextOverride ??
        (isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(navActiveText, '#ffffff', 92)
          : darkenCssColor(navActiveBackground, 24)),
      '--kangur-text-field-background': inputTone.background,
      '--kangur-text-field-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.border, '#ffffff', 28)
          : inputTone.border,
      '--kangur-text-field-text': inputTone.text,
      '--kangur-text-field-placeholder':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.inputPlaceholder, '#ffffff', 78)
          : theme.inputPlaceholder,
      '--kangur-text-field-disabled-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.background, pageTone.background, 72)
          : mixCssColor(inputTone.background, pageTone.background, 84),
      '--kangur-text-field-disabled-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(inputTone.border, '#ffffff', 18)
          : mixCssColor(inputTone.border, pageTone.background, 72),
      '--kangur-progress-track': progressTrack,
      '--kangur-accent-indigo-start': theme.gradientIndigoStart,
      '--kangur-accent-indigo-end': theme.gradientIndigoEnd,
      '--kangur-accent-violet-start': theme.gradientVioletStart,
      '--kangur-accent-violet-end': theme.gradientVioletEnd,
      '--kangur-accent-emerald-start': theme.gradientEmeraldStart,
      '--kangur-accent-emerald-end': theme.gradientEmeraldEnd,
      '--kangur-accent-sky-start': theme.gradientSkyStart,
      '--kangur-accent-sky-end': theme.gradientSkyEnd,
      '--kangur-accent-amber-start': theme.gradientAmberStart,
      '--kangur-accent-amber-end': theme.gradientAmberEnd,
      '--kangur-accent-rose-start': theme.gradientRoseStart,
      '--kangur-accent-rose-end': theme.gradientRoseEnd,
      '--kangur-accent-teal-start': theme.gradientTealStart,
      '--kangur-accent-teal-end': theme.gradientTealEnd,
      '--kangur-accent-slate-start': theme.gradientSlateStart,
      '--kangur-accent-slate-end': theme.gradientSlateEnd,
      '--kangur-gradient-soft-mid': gradientSoftMid,
      '--kangur-cta-primary-start': primaryGradientStart,
      '--kangur-cta-primary-mid': primaryGradientMid,
      '--kangur-cta-primary-end': primaryGradientEnd,
      '--kangur-cta-primary-hover-start': primaryGradientHoverStart,
      '--kangur-cta-primary-hover-mid': primaryGradientHoverMid,
      '--kangur-cta-primary-hover-end': primaryGradientHoverEnd,
      '--kangur-cta-primary-active-start': primaryGradientActiveStart,
      '--kangur-cta-primary-active-mid': primaryGradientActiveMid,
      '--kangur-cta-primary-active-end': primaryGradientActiveEnd,
      '--kangur-cta-warning-start': warningGradientStart,
      '--kangur-cta-warning-end': warningGradientEnd,
      '--kangur-cta-warning-hover-start': warningGradientHoverStart,
      '--kangur-cta-warning-hover-end': warningGradientHoverEnd,
      '--kangur-cta-success-start': successGradientStart,
      '--kangur-cta-success-end': successGradientEnd,
      '--kangur-page-text': toneText,
      '--kangur-page-muted-text': pageMutedText,
      '--kangur-button-text-shadow': buttonTextShadow,
      '--kangur-button-gloss-opacity': String(buttonGlossOpacity),
      '--kangur-button-gloss-height': buttonGlossHeight,
      '--kangur-button-gloss-angle': buttonGlossAngle,
      '--kangur-button-gloss-color': buttonGlossColor,
      '--kangur-button-border-width': buttonBorderWidth,
      '--kangur-button-border-color': buttonBorderColor,
      '--kangur-button-border-radius': buttonBorderRadius,
      '--kangur-button-primary-background': primaryButtonBackground,
      '--kangur-button-primary-text': primaryButtonText,
      '--kangur-button-primary-hover-background': primaryButtonHoverBackground,
      '--kangur-button-primary-shadow': buildGelButtonShadow(
        [`0 12px 24px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 34 : 24)}`],
        theme,
        primaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-primary-hover-shadow': buildGelButtonShadow(
        [
          `0 22px 34px -18px ${mixCssColor(primaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 40 : 30)}`,
          `0 14px 24px -18px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 22 : 16)}`,
        ],
        theme,
        primaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-primary-active-shadow': primaryButtonActiveShadow,
      '--kangur-button-secondary-background': secondaryButtonBackground,
      '--kangur-button-secondary-hover-background': secondaryButtonHoverBackground,
      '--kangur-button-secondary-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(secondaryButtonBase, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 28)}`],
        theme,
        secondaryButtonBase,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-secondary-active-shadow': secondaryButtonActiveShadow,
      '--kangur-button-secondary-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.btnSecondaryText || toneText, '#ffffff', 92)
          : theme.btnSecondaryText || toneText,
      '--kangur-button-secondary-hover-text': toneText,
      '--kangur-button-surface-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 92 : 90)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 12 : 16)} 100%)`,
      '--kangur-button-surface-hover-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 84)} 0%, ${mixCssColor(primary, surfaceBackground, isDarkStorefrontAppearanceMode(mode) ? 18 : 22)} 100%)`,
      '--kangur-button-surface-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(primary, '#000000', isDarkStorefrontAppearanceMode(mode) ? 26 : 18)}`],
        theme,
        primary,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-surface-active-shadow': surfaceButtonActiveShadow,
      '--kangur-button-surface-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(primary, '#ffffff', 72)
          : darkenCssColor(primary, 8),
      '--kangur-button-surface-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(primary, '#ffffff', 88)
          : darkenCssColor(primary, 16),
      '--kangur-button-warning-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 84 : 76)} 0%, ${mixCssColor(warningBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 88 : 68)} 100%)`,
      '--kangur-button-warning-hover-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#ffffff' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 74 : 68)} 0%, ${mixCssColor(warningBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 82 : 62)} 100%)`,
      '--kangur-button-warning-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 44 : 26)}`],
        theme,
        warningBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-warning-hover-shadow': buildGelButtonShadow(
        [
          `0 20px 32px -24px ${mixCssColor(warningBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 52 : 34)}`,
          `0 14px 24px -24px ${mixCssColor(accent, '#000000', isDarkStorefrontAppearanceMode(mode) ? 18 : 10)}`,
        ],
        theme,
        warningBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-warning-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#fde68a', '#ffffff', 92)
          : darkenCssColor(warningBackground, 42),
      '--kangur-button-warning-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#fef3c7', '#ffffff', 96)
          : darkenCssColor(warningBackground, 50),
      '--kangur-button-success-background':
        `linear-gradient(180deg, ${mixCssColor(successBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 86 : 78)} 0%, ${mixCssColor(successBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 90 : 70)} 100%)`,
      '--kangur-button-success-shadow': buildGelButtonShadow(
        [`0 16px 28px -24px ${mixCssColor(successBackground, '#000000', isDarkStorefrontAppearanceMode(mode) ? 42 : 24)}`],
        theme,
        successBackground,
        isDarkStorefrontAppearanceMode(mode)
      ),
      '--kangur-button-success-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#d1fae5', '#ffffff', 92)
          : darkenCssColor(successBackground, 36),
      '--kangur-button-success-hover-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor('#ecfdf5', '#ffffff', 96)
          : darkenCssColor(successBackground, 44),
      '--kangur-chat-panel-background':
        `linear-gradient(180deg, ${mixCssColor(surfaceTone.background, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 82 : 92)} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 92 : 88)} 100%)`,
      '--kangur-chat-panel-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 32),
      '--kangur-chat-panel-shadow': panelSnapShadow,
      '--kangur-chat-header-background':
        `linear-gradient(180deg, ${mixCssColor(warningBackground, isDarkStorefrontAppearanceMode(mode) ? '#000000' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 30 : 18)} 0%, ${mixCssColor(surfaceTone.background, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 86 : 80)} 100%)`,
      '--kangur-chat-header-snap-background': warmOverlayBackground,
      '--kangur-chat-header-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 32),
      '--kangur-chat-spotlight-border': panelSnapRing,
      '--kangur-chat-spotlight-background': backdrop,
      '--kangur-chat-spotlight-shadow': backdropStrong,
      '--kangur-chat-avatar-shell-background':
        isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
      '--kangur-chat-avatar-shell-border':
        isDarkStorefrontAppearanceMode(mode) ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)',
      '--kangur-chat-avatar-shell-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(15,23,42,0.12)'
          : 'inset 0 1px 0 rgba(255,255,255,0.24), 0 1px 2px rgba(15,23,42,0.08)',
      '--kangur-chat-avatar-svg-shadow':
        isDarkStorefrontAppearanceMode(mode)
          ? '0 1px 2px rgba(15,23,42,0.18)'
          : '0 1px 2px rgba(15,23,42,0.12)',
      '--kangur-chat-warm-overlay-background': warmOverlayBackground,
      '--kangur-chat-warm-overlay-border': warmOverlayBorder,
      '--kangur-chat-warm-overlay-shadow-callout': warmOverlayShadowCallout,
      '--kangur-chat-warm-overlay-shadow-modal': warmOverlayShadowModal,
      '--kangur-chat-pointer-glow': warningBackground,
      '--kangur-chat-pointer-marker': warningBackground,
      '--kangur-chat-tail-background': 'var(--kangur-soft-card-background)',
      '--kangur-chat-tail-border': mixCssColor(warningBackground, '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 22 : 32),
      '--kangur-chat-sheet-handle-background':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 22)
          : mixCssColor(warningBackground, '#ffffff', 30),
      '--kangur-chat-composer-background': composerBackground,
      '--kangur-chat-selection-badge-background': selectionBadgeBackground,
      '--kangur-chat-divider': dividerColor,
      '--kangur-chat-surface-soft-background':
        `linear-gradient(135deg, ${softSurfaceStart} 0%, ${softSurfaceEnd} 100%)`,
      '--kangur-chat-surface-soft-border': 'var(--kangur-soft-card-border)',
      '--kangur-chat-surface-soft-shadow': softSurfaceShadow,
      '--kangur-chat-surface-warm-background':
        `linear-gradient(135deg, ${warmSurfaceStart} 0%, ${warmSurfaceEnd} 100%)`,
      '--kangur-chat-surface-warm-border': mixCssColor(borderColor, warningBackground, 74),
      '--kangur-chat-surface-warm-shadow': warmSurfaceShadow,
      '--kangur-chat-surface-info-background':
        `linear-gradient(135deg, ${infoSurfaceStart} 0%, ${infoSurfaceEnd} 100%)`,
      '--kangur-chat-surface-info-border': mixCssColor(borderColor, infoBackground, 72),
      '--kangur-chat-surface-info-shadow': infoSurfaceShadow,
      '--kangur-chat-surface-success-background': successSurface,
      '--kangur-chat-surface-success-border': mixCssColor(borderColor, successBackground, 70),
      '--kangur-chat-surface-success-shadow': successSurfaceShadow,
      '--kangur-chat-panel-text': toneText,
      '--kangur-chat-muted-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(pageMutedText, '#ffffff', 84)
          : mixCssColor(pageMutedText, toneText, 76),
      '--kangur-chat-kicker-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(warningBackground, '#ffffff', 62)
          : darkenCssColor(warningBackground, 18),
      '--kangur-chat-kicker-dot': warningBackground,
      '--kangur-chat-chip-background':
        `linear-gradient(135deg, ${mixCssColor(accent, chatBackground, isDarkStorefrontAppearanceMode(mode) ? 44 : 34)}, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 88 : 82)})`,
      '--kangur-chat-chip-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 22)
          : mixCssColor(accent, '#ffffff', 30),
      '--kangur-chat-chip-text':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(theme.btnPrimaryText || '#fff7ed', '#ffffff', 92)
          : toneText,
      '--kangur-chat-control-background':
        `linear-gradient(180deg, ${mixCssColor(accent, chatBackground, isDarkStorefrontAppearanceMode(mode) ? 34 : 26)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 86 : 80)} 100%)`,
      '--kangur-chat-control-hover-background':
        `linear-gradient(180deg, ${mixCssColor(accent, isDarkStorefrontAppearanceMode(mode) ? '#ffffff' : '#ffffff', isDarkStorefrontAppearanceMode(mode) ? 28 : 22)} 0%, ${mixCssColor(chatBackground, pageTone.background, isDarkStorefrontAppearanceMode(mode) ? 82 : 76)} 100%)`,
      '--kangur-chat-control-border':
        isDarkStorefrontAppearanceMode(mode)
          ? mixCssColor(accent, '#ffffff', 22)
          : mixCssColor(accent, '#ffffff', 28),
      '--kangur-chat-control-text': toneText,
    },
  };
};

export {
  withFallbackTone,
  resolveStorefrontAppearanceTone,
  resolveStorefrontAppearanceColorSchemes,
} from './appearance-logic/CmsStorefrontAppearance.color-resolvers';
export { resolveKangurRuntimeThemeVars } from './appearance-logic/CmsStorefrontAppearance.runtime-vars';
export { resolveDefaultKangurStorefrontAppearance } from './appearance-logic/CmsStorefrontAppearance.default-vars';

export const resolveCmsStorefrontAppearance = (
  theme: ThemeSettings | null | undefined,
  mode: CmsStorefrontAppearanceMode
): {
  background: string;
  pageTone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} => {
  const result = theme
    ? resolveThemedKangurStorefrontAppearance(theme, mode)
    : resolveDefaultKangurStorefrontAppearance(mode);
  
  return {
    background: result.background,
    pageTone: result.tone,
    vars: result.vars,
  };
};

export const resolveKangurStorefrontAppearance = (
  mode: CmsStorefrontAppearanceMode,
  theme?: ThemeSettings | null
): {
  background: string;
  tone: Required<CmsAppearanceTone>;
  vars: Record<string, string>;
} =>
  theme
    ? resolveThemedKangurStorefrontAppearance(theme, mode)
    : resolveDefaultKangurStorefrontAppearance(mode);
