import type { PageZone } from '@/shared/contracts/cms';

const VALID_PAGE_ZONES = new Set<PageZone>(['header', 'template', 'footer']);
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off', '']);

export function normalizePageZone(value: unknown): PageZone {
  if (typeof value !== 'string') return 'template';
  const normalized = value.trim().toLowerCase();
  return VALID_PAGE_ZONES.has(normalized as PageZone) ? (normalized as PageZone) : 'template';
}

export function isCmsSectionHidden(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
  }
  return Boolean(value);
}
