import { createConfiguredKangurLocalizedTextWordmark } from '@/features/kangur/ui/components/wordmarks/KangurLocalizedTextWordmark';

const KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS = {
  de: 'Elterndashboard',
  en: 'Parent dashboard',
  pl: 'Panel rodzica',
  uk: 'Панель для батьків',
} as const;

export const KangurParentDashboardWordmark = createConfiguredKangurLocalizedTextWordmark({
  arcPath: 'M88 118C194 140 322 140 446 112',
  defaultIdPrefix: 'kangur-parent-dashboard-wordmark',
  displayName: 'KangurParentDashboardWordmark',
  labels: KANGUR_PARENT_DASHBOARD_WORDMARK_LABELS,
});
