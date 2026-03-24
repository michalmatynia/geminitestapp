import { KangurTextWordmark } from '@/features/kangur/ui/components/KangurTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/kangur-wordmark';
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

export function KangurLocalizedTextWordmark({
  arcPath,
  idPrefix,
  label,
  labels,
  locale = 'pl',
  ...props
}: KangurLocalizedTextWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || resolveLocalizedWordmarkLabel(locale, labels);

  return (
    <KangurTextWordmark
      arcPath={arcPath}
      idPrefix={idPrefix}
      label={resolvedLabel}
      {...props}
    />
  );
}
