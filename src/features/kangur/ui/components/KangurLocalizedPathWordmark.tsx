import type { ReactNode } from 'react';

import { KangurWordmarkBase } from '@/features/kangur/ui/components/KangurWordmarkBase';
import {
  KANGUR_WORDMARK_DEFAULT_TEXT_PROPS,
  type KangurLocalizedWordmarkProps,
} from '@/features/kangur/ui/components/kangur-wordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurLocalizedPathWordmarkProps = KangurLocalizedWordmarkProps & {
  arcPath: string;
  children: ReactNode;
  defaultLabel: string;
  matchesPolishPathLabel: (resolvedLabel: string) => boolean;
  wordTransform: string;
};

type KangurConfiguredLocalizedPathWordmark = {
  arcPath: string;
  children: ReactNode;
  defaultIdPrefix: string;
  defaultLabel: string;
  displayName?: string;
  matchesPolishPathLabel: (resolvedLabel: string) => boolean;
  wordTransform: string;
};

export function createNormalizedWordmarkLabelMatcher(
  expectedLabel: string,
  stripPattern = /[!\s-]+/g
): (resolvedLabel: string) => boolean {
  return (resolvedLabel) =>
    resolvedLabel.toLocaleLowerCase('pl-PL').replace(stripPattern, '') === expectedLabel;
}

function renderKangurLocalizedPathWordmark({
  arcPath,
  children,
  defaultLabel,
  idPrefix,
  label,
  locale = 'pl',
  matchesPolishPathLabel,
  wordTransform,
  ...props
}: KangurLocalizedPathWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || defaultLabel;
  const shouldUsePolishPathWordmark =
    normalizeSiteLocale(locale) === 'pl' && matchesPolishPathLabel(resolvedLabel);

  return (
    <KangurWordmarkBase
      arcPath={arcPath}
      idPrefix={idPrefix}
      textLabel={shouldUsePolishPathWordmark ? undefined : resolvedLabel}
      textProps={
        shouldUsePolishPathWordmark
          ? undefined
          : KANGUR_WORDMARK_DEFAULT_TEXT_PROPS
      }
      wordTransform={wordTransform}
      {...props}
    >
      {shouldUsePolishPathWordmark ? children : null}
    </KangurWordmarkBase>
  );
}

export function createConfiguredKangurLocalizedPathWordmark({
  arcPath,
  children,
  defaultIdPrefix,
  defaultLabel,
  displayName,
  matchesPolishPathLabel,
  wordTransform,
}: KangurConfiguredLocalizedPathWordmark): (props: KangurLocalizedWordmarkProps) => React.JSX.Element {
  const ConfiguredKangurLocalizedPathWordmark = ({
    idPrefix = defaultIdPrefix,
    label = defaultLabel,
    locale = 'pl',
    ...props
  }: KangurLocalizedWordmarkProps): React.JSX.Element =>
    renderKangurLocalizedPathWordmark({
      arcPath,
      defaultLabel,
      idPrefix,
      label,
      locale,
      matchesPolishPathLabel,
      wordTransform,
      ...props,
      children,
    });

  ConfiguredKangurLocalizedPathWordmark.displayName =
    displayName ?? `Configured(${defaultIdPrefix})`;

  return ConfiguredKangurLocalizedPathWordmark;
}
