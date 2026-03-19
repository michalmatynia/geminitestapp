import { KangurTextWordmark } from '@/features/kangur/ui/components/KangurTextWordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurTestsWordmarkProps = React.SVGProps<SVGSVGElement> & {
  idPrefix?: string;
  label?: string;
  locale?: string | null;
};

const KANGUR_TESTS_WORDMARK_LABELS = {
  de: 'Prüfungen',
  en: 'Tests',
  pl: 'Testy',
} as const;

const getKangurTestsWordmarkLabel = (locale: string | null | undefined): string => {
  switch (normalizeSiteLocale(locale)) {
    case 'de':
      return KANGUR_TESTS_WORDMARK_LABELS.de;
    case 'en':
      return KANGUR_TESTS_WORDMARK_LABELS.en;
    default:
      return KANGUR_TESTS_WORDMARK_LABELS.pl;
  }
};

export function KangurTestsWordmark({
  idPrefix = 'kangur-tests-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurTestsWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || getKangurTestsWordmarkLabel(locale);

  return (
    <KangurTextWordmark
      arcPath='M112 118C211 140 322 140 438 112'
      idPrefix={idPrefix}
      label={resolvedLabel}
      {...props}
    />
  );
}
