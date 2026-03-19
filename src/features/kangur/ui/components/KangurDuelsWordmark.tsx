import { KangurTextWordmark } from '@/features/kangur/ui/components/KangurTextWordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurDuelsWordmarkProps = React.SVGProps<SVGSVGElement> & {
  idPrefix?: string;
  label?: string;
  locale?: string | null;
};

const KANGUR_DUELS_WORDMARK_LABELS = {
  de: 'Duell-Lobby',
  en: 'Duels lobby',
  pl: 'Lobby pojedynkow',
} as const;

const getKangurDuelsWordmarkLabel = (locale: string | null | undefined): string => {
  switch (normalizeSiteLocale(locale)) {
    case 'de':
      return KANGUR_DUELS_WORDMARK_LABELS.de;
    case 'en':
      return KANGUR_DUELS_WORDMARK_LABELS.en;
    default:
      return KANGUR_DUELS_WORDMARK_LABELS.pl;
  }
};

export function KangurDuelsWordmark({
  idPrefix = 'kangur-duels-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurDuelsWordmarkProps): React.JSX.Element {
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
