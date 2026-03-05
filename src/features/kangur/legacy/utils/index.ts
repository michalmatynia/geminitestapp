import { getKangurPageHref } from '@/features/kangur/config/routing';

export function createPageUrl(pageName: string): string {
  return getKangurPageHref(pageName);
}
