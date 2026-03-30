import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '@/shared/contracts/cms-theme';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import {
  KANGUR_DEFAULT_DAILY_THEME,
  KANGUR_DEFAULT_THEME,
  KANGUR_NIGHTLY_AURORA_THEME,
  KANGUR_NIGHTLY_NOCTURNE_THEME,
  KANGUR_NIGHTLY_THEME,
  parseKangurThemePresetManifest,
  parseKangurThemeSettings,
  resolveKangurThemePresetManifestEntry,
  resolveKangurStoredThemeForAppearanceMode,
  resolveKangurStoredThemeSnapshot,
  resolveKangurThemeSettingsRawForMode,
} from './theme-settings';

describe('parseKangurThemeSettings', () => {
  it('returns null when no Kangur theme setting is stored', () => {
    expect(parseKangurThemeSettings(undefined)).toBeNull();
    expect(parseKangurThemeSettings(null)).toBeNull();
    expect(parseKangurThemeSettings('')).toBeNull();
  });

  it('normalizes a stored Kangur theme payload from settings', () => {
    const parsed = parseKangurThemeSettings(
      serializeSetting({
        backgroundColor: '#faf5ff',
        primaryColor: '#7c3aed',
      })
    );

    expect(parsed).toMatchObject({
      ...KANGUR_DEFAULT_DAILY_THEME,
      backgroundColor: '#faf5ff',
      primaryColor: '#7c3aed',
    });
  });

  it('normalizes daily themes against the daily baseline', () => {
    const parsed = parseKangurThemeSettings(
      serializeSetting({
        backgroundColor: '#faf5ff',
      }),
      KANGUR_DEFAULT_DAILY_THEME
    );

    expect(parsed).toMatchObject({
      backgroundColor: '#faf5ff',
      darkMode: false,
    });
  });

  it('keeps the nightly preset on a daily-after-dark shell palette without changing the home action families', () => {
    expect(KANGUR_NIGHTLY_THEME).toMatchObject({
      darkMode: true,
      primaryColor: '#8a80ff',
      secondaryColor: '#baa4ff',
      accentColor: '#86c8ff',
      backgroundColor: '#0f1222',
      surfaceColor: '#171b31',
      textColor: '#eef1ff',
      mutedTextColor: '#b4bbd7',
      borderColor: '#242943',
      btnPrimaryBg: 'linear-gradient(135deg, #7b82ff 0%, #b590ff 58%, #ff9d7a 100%)',
      btnSecondaryBg: 'rgba(23, 27, 49, 0.9)',
      btnOutlineBorder: '#2d3350',
      pillBg: 'rgba(24, 28, 50, 0.84)',
      pillActiveBg: 'rgba(92, 98, 162, 0.28)',
      inputBg: '#15192d',
      inputFocusBorder: '#aca1ff',
      containerBg: '#181c33',
      containerBorderColor: '#242943',
      panelGradientStart: '#23294b',
      panelGradientEnd: '#14182c',
      navGradientStart: '#1e2444',
      navGradientEnd: '#121629',
      dropdownBg: '#1a1f38',
      dropdownBorder: '#2f3553',
      drawerBg: '#171b31',
      drawerBorderColor: '#242943',
      popupOverlayColor: 'rgba(8, 10, 22, 0.58)',
      activeColorSchemeId: 'kangur-aurora-teal',
      colorSchemes: [
        {
          id: 'kangur-aurora-teal',
          name: 'Night Indigo',
          colors: {
            background: '#0f1222',
            surface: '#181c33',
            text: '#eef1ff',
            accent: '#8a80ff',
            border: '#252943',
          },
        },
        {
          id: 'kangur-aurora-violet',
          name: 'Night Lilac',
          colors: {
            background: '#141126',
            surface: '#1d1832',
            text: '#f0efff',
            accent: '#c095ff',
            border: '#2b2341',
          },
        },
        {
          id: 'kangur-aurora-blue',
          name: 'Night Sky',
          colors: {
            background: '#101625',
            surface: '#182036',
            text: '#eef1ff',
            accent: '#86c8ff',
            border: '#24324a',
          },
        },
        {
          id: 'kangur-aurora-emerald',
          name: 'Night Meadow',
          colors: {
            background: '#101821',
            surface: '#17232d',
            text: '#eef6f4',
            accent: '#69d3b9',
            border: '#24343f',
          },
        },
      ],
      homeActionLessonsTextColor: '#dbe7ff',
      homeActionLessonsTextActiveColor: '#f8fafc',
      homeActionLessonsLabelStart: '#4f62db',
      homeActionLessonsLabelMid: '#7aa2ff',
      homeActionLessonsLabelEnd: '#b08bff',
      homeActionLessonsAccentStart: '#4f62db',
      homeActionLessonsAccentMid: '#7aa2ff',
      homeActionLessonsAccentEnd: '#b08bff',
      homeActionLessonsUnderlayStart: 'rgba(79, 98, 219, 0.42)',
      homeActionLessonsUnderlayMid: 'rgba(122, 162, 255, 0.34)',
      homeActionLessonsUnderlayEnd: 'rgba(176, 139, 255, 0.46)',
      homeActionLessonsUnderlayTintStart: 'rgba(79, 98, 219, 0.24)',
      homeActionLessonsUnderlayTintMid: 'rgba(122, 162, 255, 0.48)',
      homeActionLessonsUnderlayTintEnd: 'rgba(176, 139, 255, 0.66)',
      homeActionLessonsAccentShadowColor: '#7aa2ff',
      homeActionLessonsUnderlayShadowColor: '#b08bff',
      homeActionLessonsSurfaceShadowColor: '#4f62db',
      homeActionPlayTextColor: '#efe9ff',
      homeActionPlayTextActiveColor: '#f8fafc',
      homeActionPlayLabelStart: '#6b86ff',
      homeActionPlayLabelMid: '#b08bff',
      homeActionPlayLabelEnd: '#f0a3ff',
      homeActionPlayAccentStart: '#6b86ff',
      homeActionPlayAccentMid: '#b08bff',
      homeActionPlayAccentEnd: '#f0a3ff',
      homeActionPlayUnderlayStart: 'rgba(107, 134, 255, 0.42)',
      homeActionPlayUnderlayMid: 'rgba(176, 139, 255, 0.34)',
      homeActionPlayUnderlayEnd: 'rgba(240, 163, 255, 0.44)',
      homeActionPlayUnderlayTintStart: 'rgba(107, 134, 255, 0.24)',
      homeActionPlayUnderlayTintMid: 'rgba(176, 139, 255, 0.48)',
      homeActionPlayUnderlayTintEnd: 'rgba(240, 163, 255, 0.64)',
      homeActionPlayAccentShadowColor: '#b08bff',
      homeActionPlayUnderlayShadowColor: '#f0a3ff',
      homeActionPlaySurfaceShadowColor: '#6b86ff',
      homeActionTrainingTextColor: '#d8f2ff',
      homeActionTrainingTextActiveColor: '#f8fafc',
      homeActionTrainingLabelStart: '#3ea1da',
      homeActionTrainingLabelMid: '#64f4ff',
      homeActionTrainingLabelEnd: '#7fd5ff',
      homeActionTrainingAccentStart: '#3ea1da',
      homeActionTrainingAccentMid: '#64f4ff',
      homeActionTrainingAccentEnd: '#7fd5ff',
      homeActionTrainingUnderlayStart: 'rgba(62, 161, 218, 0.42)',
      homeActionTrainingUnderlayMid: 'rgba(100, 244, 255, 0.34)',
      homeActionTrainingUnderlayEnd: 'rgba(127, 213, 255, 0.44)',
      homeActionTrainingUnderlayTintStart: 'rgba(62, 161, 218, 0.24)',
      homeActionTrainingUnderlayTintMid: 'rgba(100, 244, 255, 0.44)',
      homeActionTrainingUnderlayTintEnd: 'rgba(127, 213, 255, 0.62)',
      homeActionTrainingAccentShadowColor: '#64f4ff',
      homeActionTrainingUnderlayShadowColor: '#3ea1da',
      homeActionTrainingSurfaceShadowColor: '#3ea1da',
      homeActionKangurTextColor: '#d9fff2',
      homeActionKangurTextActiveColor: '#f8fafc',
      homeActionKangurLabelStart: '#52e0b7',
      homeActionKangurLabelMid: '#64f4ff',
      homeActionKangurLabelEnd: '#7aa2ff',
      homeActionKangurAccentStart: '#52e0b7',
      homeActionKangurAccentMid: '#64f4ff',
      homeActionKangurAccentEnd: '#7aa2ff',
      homeActionKangurUnderlayStart: 'rgba(82, 224, 183, 0.42)',
      homeActionKangurUnderlayMid: 'rgba(100, 244, 255, 0.34)',
      homeActionKangurUnderlayEnd: 'rgba(122, 162, 255, 0.44)',
      homeActionKangurUnderlayTintStart: 'rgba(82, 224, 183, 0.24)',
      homeActionKangurUnderlayTintMid: 'rgba(100, 244, 255, 0.44)',
      homeActionKangurUnderlayTintEnd: 'rgba(122, 162, 255, 0.64)',
      homeActionKangurAccentShadowColor: '#64f4ff',
      homeActionKangurUnderlayShadowColor: '#52e0b7',
      homeActionKangurSurfaceShadowColor: '#52e0b7',
    });
  });

  it('exposes a darker Nightly Nocturne preset with complementary border families while preserving Aurora action buttons', () => {
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME).toMatchObject({
      darkMode: true,
      themePreset: 'kangur-nightly-nocturne',
      backgroundColor: '#080b16',
      surfaceColor: '#12182b',
      textColor: '#eef2ff',
      mutedTextColor: '#aab4d3',
      borderColor: '#3a2d61',
      btnOutlineBorder: '#3a4a70',
      pillBorderColor: '#334866',
      inputBorderColor: '#384567',
      containerBorderColor: '#443264',
      dropdownBorder: '#335a79',
      drawerBorderColor: '#2f5a74',
      imageBorderColor: '#2d5474',
      activeColorSchemeId: 'kangur-nocturne-indigo',
      colorSchemes: [
        {
          id: 'kangur-nocturne-indigo',
          name: 'Nocturne Indigo',
          colors: {
            background: '#080b16',
            surface: '#12182b',
            text: '#eef2ff',
            accent: '#9a8fff',
            border: '#4a3775',
          },
        },
        {
          id: 'kangur-nocturne-lilac',
          name: 'Nocturne Lilac',
          colors: {
            background: '#110d1f',
            surface: '#171128',
            text: '#f3eeff',
            accent: '#d298ff',
            border: '#643359',
          },
        },
        {
          id: 'kangur-nocturne-sky',
          name: 'Nocturne Sky',
          colors: {
            background: '#07101a',
            surface: '#101c2c',
            text: '#ebf6ff',
            accent: '#8fd6ff',
            border: '#2c5c7c',
          },
        },
        {
          id: 'kangur-nocturne-meadow',
          name: 'Nocturne Meadow',
          colors: {
            background: '#07140f',
            surface: '#11211c',
            text: '#ebfaf4',
            accent: '#6fdcc1',
            border: '#2b6058',
          },
        },
      ],
    });

    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.backgroundColor).not.toBe(
      KANGUR_NIGHTLY_AURORA_THEME.backgroundColor
    );
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.surfaceColor).not.toBe(
      KANGUR_NIGHTLY_AURORA_THEME.surfaceColor
    );
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.homeActionLessonsLabelStart).toBe(
      KANGUR_NIGHTLY_AURORA_THEME.homeActionLessonsLabelStart
    );
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.homeActionPlayLabelMid).toBe(
      KANGUR_NIGHTLY_AURORA_THEME.homeActionPlayLabelMid
    );
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.homeActionTrainingAccentEnd).toBe(
      KANGUR_NIGHTLY_AURORA_THEME.homeActionTrainingAccentEnd
    );
    expect(KANGUR_NIGHTLY_NOCTURNE_THEME.homeActionKangurUnderlayShadowColor).toBe(
      KANGUR_NIGHTLY_AURORA_THEME.homeActionKangurUnderlayShadowColor
    );
  });

  it('patches legacy CMS geometry defaults to Kangur baseline values', () => {
    const parsed = parseKangurThemeSettings(
      serializeSetting({
        ...DEFAULT_THEME,
        backgroundColor: '#fff7ed',
      })
    );

    expect(parsed).toMatchObject({
      backgroundColor: '#fff7ed',
      headingFont: KANGUR_DEFAULT_THEME.headingFont,
      bodyFont: KANGUR_DEFAULT_THEME.bodyFont,
      maxContentWidth: KANGUR_DEFAULT_THEME.maxContentWidth,
      gridGutter: KANGUR_DEFAULT_THEME.gridGutter,
      pagePadding: KANGUR_DEFAULT_THEME.pagePadding,
      pagePaddingTop: KANGUR_DEFAULT_THEME.pagePaddingTop,
      pagePaddingRight: KANGUR_DEFAULT_THEME.pagePaddingRight,
      pagePaddingBottom: KANGUR_DEFAULT_THEME.pagePaddingBottom,
      pagePaddingLeft: KANGUR_DEFAULT_THEME.pagePaddingLeft,
      containerRadius: KANGUR_DEFAULT_THEME.containerRadius,
      containerPaddingInner: KANGUR_DEFAULT_THEME.containerPaddingInner,
      cardRadius: KANGUR_DEFAULT_THEME.cardRadius,
      btnPaddingX: KANGUR_DEFAULT_THEME.btnPaddingX,
      btnPaddingY: KANGUR_DEFAULT_THEME.btnPaddingY,
      btnFontSize: KANGUR_DEFAULT_THEME.btnFontSize,
      btnRadius: KANGUR_DEFAULT_THEME.btnRadius,
      pillRadius: KANGUR_DEFAULT_THEME.pillRadius,
      pillPaddingX: KANGUR_DEFAULT_THEME.pillPaddingX,
      pillPaddingY: KANGUR_DEFAULT_THEME.pillPaddingY,
      pillFontSize: KANGUR_DEFAULT_THEME.pillFontSize,
      inputHeight: KANGUR_DEFAULT_THEME.inputHeight,
      inputRadius: KANGUR_DEFAULT_THEME.inputRadius,
    });
  });

  it('returns null when no slot theme exists for the active appearance mode', () => {
    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'default',
        dailyThemeRaw: null,
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: null,
      })
    ).toBeNull();

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'dark',
        dailyThemeRaw: null,
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: null,
      })
    ).toBeNull();
  });

  it('does not reuse other slot themes when the active slot is missing', () => {
    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'default',
        dailyThemeRaw: null,
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBeNull();
  });

  it('selects the matching slot theme for each appearance mode', () => {
    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'default',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: 'dawn-theme',
        sunsetThemeRaw: 'sunset-theme',
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBe('daily-theme');

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'dawn',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: 'dawn-theme',
        sunsetThemeRaw: 'sunset-theme',
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBe('dawn-theme');

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'sunset',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: 'dawn-theme',
        sunsetThemeRaw: 'sunset-theme',
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBe('sunset-theme');

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'dark',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: 'dawn-theme',
        sunsetThemeRaw: 'sunset-theme',
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBe('nightly-theme');
  });

  it('does not reuse legacy or daily themes when slots are partially configured', () => {
    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'dark',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: null,
      })
    ).toBeNull();

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'default',
        dailyThemeRaw: null,
        dawnThemeRaw: 'dawn-theme',
        sunsetThemeRaw: null,
        nightlyThemeRaw: null,
      })
    ).toBeNull();
  });

  it('uses the active slot theme when that slot is configured', () => {
    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'default',
        dailyThemeRaw: 'daily-theme',
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: null,
      })
    ).toBe('daily-theme');

    expect(
      resolveKangurThemeSettingsRawForMode({
        mode: 'dark',
        dailyThemeRaw: null,
        dawnThemeRaw: null,
        sunsetThemeRaw: null,
        nightlyThemeRaw: 'nightly-theme',
      })
    ).toBe('nightly-theme');
  });
});

describe('resolveKangurStoredThemeSnapshot', () => {
  it('prefers stored theme payloads over the code default baseline', () => {
    const snapshot = resolveKangurStoredThemeSnapshot({
      dailyThemeRaw: serializeSetting({ primaryColor: '#ff44aa' }),
      dawnThemeRaw: null,
      sunsetThemeRaw: null,
      nightlyThemeRaw: null,
    });

    expect(snapshot.daily.primaryColor).toBe('#ff44aa');
    expect(snapshot.daily.backgroundColor).toBe(KANGUR_DEFAULT_DAILY_THEME.backgroundColor);
  });

  it('falls back to the nightly baseline when no nightly payload is stored', () => {
    const snapshot = resolveKangurStoredThemeSnapshot({
      dailyThemeRaw: null,
      dawnThemeRaw: null,
      sunsetThemeRaw: null,
      nightlyThemeRaw: null,
    });

    expect(snapshot.nightly.backgroundColor).toBe(KANGUR_DEFAULT_THEME.backgroundColor);
    expect(snapshot.nightly.primaryColor).toBe(KANGUR_DEFAULT_THEME.primaryColor);
  });
});

describe('resolveKangurStoredThemeForAppearanceMode', () => {
  it('returns the resolved sunset slot theme for sunset mode', () => {
    const theme = resolveKangurStoredThemeForAppearanceMode({
      mode: 'sunset',
      dailyThemeRaw: serializeSetting({ backgroundColor: '#111111' }),
      dawnThemeRaw: serializeSetting({ backgroundColor: '#222222' }),
      sunsetThemeRaw: serializeSetting({ backgroundColor: '#ff8800' }),
      nightlyThemeRaw: serializeSetting({ backgroundColor: '#333333' }),
    });

    expect(theme.backgroundColor).toBe('#ff8800');
  });

  it('falls back to the stored nightly baseline for dark mode when the payload is empty', () => {
    const theme = resolveKangurStoredThemeForAppearanceMode({
      mode: 'dark',
      dailyThemeRaw: null,
      dawnThemeRaw: null,
      sunsetThemeRaw: null,
      nightlyThemeRaw: '',
    });

    expect(theme.backgroundColor).toBe(KANGUR_DEFAULT_THEME.backgroundColor);
  });
});

describe('theme preset manifest', () => {
  it('parses and normalizes valid manifest entries', () => {
    const manifest = parseKangurThemePresetManifest(
      serializeSetting([
        {
          id: 'factory_daily',
          kind: 'factory',
          slot: 'daily',
          settings: { primaryColor: '#ff44aa' },
        },
      ])
    );

    expect(manifest).toHaveLength(1);
    expect(manifest[0]).toMatchObject({
      id: 'factory_daily',
      kind: 'factory',
      slot: 'daily',
      settings: {
        primaryColor: '#ff44aa',
        backgroundColor: KANGUR_DEFAULT_DAILY_THEME.backgroundColor,
      },
    });
  });

  it('ignores invalid manifest entries and resolves entries by id', () => {
    const manifest = parseKangurThemePresetManifest(
      JSON.stringify([
        {
          id: 'preset_daily_crystal',
          kind: 'preset',
          slot: 'daily',
          settings: { primaryColor: '#123456' },
        },
        {
          id: 'broken',
          kind: 'unknown',
          slot: 'daily',
          settings: {},
        },
      ])
    );

    expect(manifest).toHaveLength(1);
    expect(resolveKangurThemePresetManifestEntry(manifest, 'preset_daily_crystal')?.settings.primaryColor).toBe(
      '#123456'
    );
    expect(resolveKangurThemePresetManifestEntry(manifest, 'missing')).toBeNull();
  });
});
