import {
  renderKangurTextWordmark,
} from '@/features/kangur/ui/components/wordmarks/KangurTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/wordmarks/kangur-wordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurWordmarkLocaleLabels = {
  de: string;
  en: string;
  pl: string;
  uk: string;
};

type KangurLocalizedTextWordmarkProps = KangurLocalizedWordmarkProps & {
  arcPath: string;
  labels: KangurWordmarkLocaleLabels;
};

type KangurConfiguredLocalizedTextWordmark = {
  arcPath: string;
  defaultIdPrefix: string;
  displayName?: string;
  labels: KangurWordmarkLocaleLabels;
};

export function resolveLocalizedWordmarkLabel(
  locale: string | null | undefined,
  labels: KangurWordmarkLocaleLabels
): string {
  switch (normalizeSiteLocale(locale)) {
    case 'de':
      return labels.de;
    case 'en':
      return labels.en;
    case 'uk':
      return labels.uk;
    default:
      return labels.pl;
  }
}

function renderKangurLocalizedTextWordmark({
  arcPath,
  idPrefix,
  label,
  labels,
  locale = 'pl',
  ...props
}: KangurLocalizedTextWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || resolveLocalizedWordmarkLabel(locale, labels);

  return renderKangurTextWordmark({
    arcPath,
    idPrefix,
    label: resolvedLabel,
    ...props,
  });
}

export function createConfiguredKangurLocalizedTextWordmark({
  arcPath,
  defaultIdPrefix,
  displayName,
  labels,
}: KangurConfiguredLocalizedTextWordmark): (props: KangurLocalizedWordmarkProps) => React.JSX.Element {
  const ConfiguredKangurLocalizedTextWordmark = ({
    idPrefix = defaultIdPrefix,
    label,
    locale = 'pl',
    ...props
  }: KangurLocalizedWordmarkProps): React.JSX.Element =>
    renderKangurLocalizedTextWordmark({
      arcPath,
      idPrefix,
      label,
      labels,
      locale,
      ...props,
    });

  ConfiguredKangurLocalizedTextWordmark.displayName =
    displayName ?? `Configured(${defaultIdPrefix})`;

  return ConfiguredKangurLocalizedTextWordmark;
}
