import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME } from '@/shared/contracts/cms-theme';
import { serializeSetting } from '@/shared/utils/settings-json';

import { KANGUR_DEFAULT_THEME, parseKangurThemeSettings } from './theme-settings';

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
      ...KANGUR_DEFAULT_THEME,
      backgroundColor: '#faf5ff',
      primaryColor: '#7c3aed',
    });
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
});
