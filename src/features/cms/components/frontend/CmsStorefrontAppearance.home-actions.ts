import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  isNonEmptyString,
  mixCssColor,
  toRgbTupleString,
} from './CmsStorefrontAppearance.utils';

const HOME_ACTION_THEME_CONFIG = [
  { id: 'lessons', prefix: 'homeActionLessons' },
  { id: 'play', prefix: 'homeActionPlay' },
  { id: 'training', prefix: 'homeActionTraining' },
  { id: 'kangur', prefix: 'homeActionKangur' },
] as const;

export const resolveHomeActionVars = (theme: ThemeSettings): Record<string, string> => {
  const vars: Record<string, string> = {};
  const setVar = (name: string, value: unknown): void => {
    if (isNonEmptyString(value)) {
      vars[name] = value.trim();
    }
  };
  const setMidVar = (
    name: string,
    start: string | undefined,
    mid: string | undefined,
    end: string | undefined
  ): void => {
    if (isNonEmptyString(mid)) {
      vars[name] = mid.trim();
      return;
    }
    if (isNonEmptyString(start) && isNonEmptyString(end)) {
      vars[name] = mixCssColor(start.trim(), end.trim(), 50);
    }
  };
  const setRgbVar = (name: string, value: string | undefined): void => {
    if (!isNonEmptyString(value)) return;
    const tuple = toRgbTupleString(value);
    if (tuple) vars[name] = tuple;
  };

  HOME_ACTION_THEME_CONFIG.forEach(({ id, prefix }) => {
    const get = (suffix: string): string | undefined => {
      const value = (theme as Record<string, unknown>)[`${prefix}${suffix}`];
      return typeof value === 'string' ? value : undefined;
    };

    const text = get('TextColor');
    const textActive = get('TextActiveColor');
    setVar(`--kangur-home-action-${id}-text`, text);
    setVar(`--kangur-home-action-${id}-text-active`, textActive);

    const labelStart = get('LabelStart');
    const labelMid = get('LabelMid');
    const labelEnd = get('LabelEnd');
    setVar(`--kangur-home-action-${id}-label-start`, labelStart);
    setVar(`--kangur-home-action-${id}-label-end`, labelEnd);
    setMidVar(`--kangur-home-action-${id}-label-mid`, labelStart, labelMid, labelEnd);

    const labelStartActive = get('LabelStartActive');
    const labelMidActive = get('LabelMidActive');
    const labelEndActive = get('LabelEndActive');
    setVar(`--kangur-home-action-${id}-label-start-active`, labelStartActive);
    setVar(`--kangur-home-action-${id}-label-end-active`, labelEndActive);
    setMidVar(
      `--kangur-home-action-${id}-label-mid-active`,
      labelStartActive,
      labelMidActive,
      labelEndActive
    );

    const accentStart = get('AccentStart');
    const accentMid = get('AccentMid');
    const accentEnd = get('AccentEnd');
    setVar(`--kangur-home-action-${id}-accent-start`, accentStart);
    setVar(`--kangur-home-action-${id}-accent-end`, accentEnd);
    setMidVar(`--kangur-home-action-${id}-accent-mid`, accentStart, accentMid, accentEnd);

    const underlayStart = get('UnderlayStart');
    const underlayMid = get('UnderlayMid');
    const underlayEnd = get('UnderlayEnd');
    setVar(`--kangur-home-action-${id}-underlay-start`, underlayStart);
    setVar(`--kangur-home-action-${id}-underlay-end`, underlayEnd);
    setMidVar(`--kangur-home-action-${id}-underlay-mid`, underlayStart, underlayMid, underlayEnd);

    const underlayTintStart = get('UnderlayTintStart');
    const underlayTintMid = get('UnderlayTintMid');
    const underlayTintEnd = get('UnderlayTintEnd');
    setVar(`--kangur-home-action-${id}-underlay-tint-start`, underlayTintStart);
    setVar(`--kangur-home-action-${id}-underlay-tint-end`, underlayTintEnd);
    setMidVar(
      `--kangur-home-action-${id}-underlay-tint-mid`,
      underlayTintStart,
      underlayTintMid,
      underlayTintEnd
    );

    const accentShadowSource =
      get('AccentShadowColor') || accentMid || accentStart || accentEnd;
    const underlayShadowSource =
      get('UnderlayShadowColor') || underlayTintMid || underlayMid || underlayTintStart || underlayStart;
    const surfaceShadowSource =
      get('SurfaceShadowColor') || underlayTintEnd || underlayEnd || underlayTintMid || underlayMid;

    setRgbVar(`--kangur-home-action-${id}-accent-shadow-rgb`, accentShadowSource);
    setRgbVar(`--kangur-home-action-${id}-underlay-shadow-rgb`, underlayShadowSource);
    setRgbVar(`--kangur-home-action-${id}-surface-shadow-rgb`, surfaceShadowSource);
  });

  return vars;
};
