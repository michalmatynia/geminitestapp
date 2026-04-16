'use client';

import { PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS } from '@/shared/contracts/products/drafts';
import type { ProductDraftOpenFormTab } from '@/shared/contracts/products';

const PRODUCT_FORM_TAB_SET = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);

export function normalizeProductFormTab(value: unknown): ProductDraftOpenFormTab {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (!PRODUCT_FORM_TAB_SET.has(trimmed)) return 'general';
  return trimmed as ProductDraftOpenFormTab;
}

export function subscribePopstate(cb: () => void): (() => void) {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
}

export function getSearchSnapshot(): string {
  return typeof window !== 'undefined' ? window.location.search : '';
}

export function getSearchServerSnapshot(): string {
  return '';
}
