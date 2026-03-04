import type { PageZone } from '@/shared/contracts/cms';

const VALID_PAGE_ZONES = new Set<PageZone>(['header', 'template', 'footer']);

export function normalizePageZone(value: unknown): PageZone {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim().toLowerCase();
  return VALID_PAGE_ZONES.has(normalized as PageZone) ? (normalized as PageZone) : 'template';
}

export function isCmsSectionHidden(value: unknown): boolean {
  return value === true;
}
