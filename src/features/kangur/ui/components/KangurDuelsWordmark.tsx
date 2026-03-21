import { KangurTextWordmark } from '@/features/kangur/ui/components/KangurTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/kangur-wordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const KANGUR_DUELS_WORDMARK_LABELS = {
  de: 'Duell-Lobby',
  en: 'Duels lobby',
  pl: 'Lobby pojedynkow',
  uk: 'Лобі дуелей',
} as const;

const getKangurDuelsWordmarkLabel = (locale: string | null | undefined): string => {
  switch (normalizeSiteLocale(locale)) {
    case 'de':
      return KANGUR_DUELS_WORDMARK_LABELS.de;
    case 'en':
      return KANGUR_DUELS_WORDMARK_LABELS.en;
    case 'uk':
      return KANGUR_DUELS_WORDMARK_LABELS.uk;
    default:
      return KANGUR_DUELS_WORDMARK_LABELS.pl;
  }
};

export function KangurDuelsWordmark({
  idPrefix = 'kangur-duels-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurLocalizedWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || getKangurDuelsWordmarkLabel(locale);

  return (
    <KangurTextWordmark
      arcPath='M94 118C198 140 322 140 448 112'
      idPrefix={idPrefix}
      label={resolvedLabel}
      {...props}
    />
  );
}
