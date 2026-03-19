import { KangurTextWordmark } from '@/features/kangur/ui/components/KangurTextWordmark';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurParentDashboardWordmarkProps = React.SVGProps<SVGSVGElement> & {
  idPrefix?: string;
  label?: string;
  locale?: string | null;
};

const KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS = {
  de: 'Elterndashboard',
  en: 'Parent dashboard',
  pl: 'Panel rodzica',
} as const;

const getKangurParentDashboardWordmarkLabel = (locale: string | null | undefined): string => {
  switch (normalizeSiteLocale(locale)) {
    case 'de':
      return KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS.de;
    case 'en':
      return KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS.en;
    default:
      return KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS.pl;
  }
};

export function KangurParentDashboardWordmark({
  idPrefix = 'kangur-parent-dashboard-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurParentDashboardWordmarkProps): React.JSX.Element {
  const resolvedLabel = label?.trim() || getKangurParentDashboardWordmarkLabel(locale);

  return (
    <KangurTextWordmark
      arcPath='M88 118C194 140 322 140 446 112'
      idPrefix={idPrefix}
      label={resolvedLabel}
      {...props}
    />
  );
}
