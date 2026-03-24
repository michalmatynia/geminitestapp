import { KangurLocalizedTextWordmark } from '@/features/kangur/ui/components/KangurLocalizedTextWordmark';
import type { KangurLocalizedWordmarkProps } from '@/features/kangur/ui/components/kangur-wordmark';

const KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS = {
  de: 'Elterndashboard',
  en: 'Parent dashboard',
  pl: 'Panel rodzica',
  uk: 'Панель для батьків',
} as const;

export function KangurParentDashboardWordmark({
  idPrefix = 'kangur-parent-dashboard-wordmark',
  label,
  locale = 'pl',
  ...props
}: KangurLocalizedWordmarkProps): React.JSX.Element {
  return (
    <KangurLocalizedTextWordmark
      arcPath='M88 118C194 140 322 140 446 112'
      idPrefix={idPrefix}
      label={label}
      labels={KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS}
      locale={locale}
      {...props}
    />
  );
}
