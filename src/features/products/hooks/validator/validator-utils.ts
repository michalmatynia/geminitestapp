'use client';

import type { SetStateAction } from 'react';
import type { ProductWithImages } from '@/shared/contracts/products';

export const VALIDATION_DENY_BEHAVIOR_SESSION_KEY = 'product_validation_deny_behavior_by_scope';
export const VALIDATION_DENIED_ISSUES_SESSION_KEY = 'product_validation_denied_issues';
export const VALIDATION_ACCEPTED_ISSUES_SESSION_KEY = 'product_validation_accepted_issues';
export const VALIDATION_DENY_SESSION_ID_KEY = 'product_validation_decision_session_id';

export const AUTO_ACCEPT_MAX_TRACKED_ENTITIES = 10;

export const resolveBooleanStateAction = (next: SetStateAction<boolean>, current: boolean): boolean =>
  typeof next === 'function' ? (next as (prev: boolean) => boolean)(current) : next;

export const resolveLatestProductValidatorSourceValues = ({
  products,
  currentProductId,
  isFetching,
}: {
  products: ProductWithImages[] | undefined;
  currentProductId?: string | null;
  isFetching: boolean;
}): Record<string, unknown> | null => {
  if (isFetching) return null;

  const list = products ?? [];
  if (list.length === 0) return null;

  const normalizedCurrentProductId =
    typeof currentProductId === 'string' ? currentProductId.trim() : '';

  const preferred = normalizedCurrentProductId
    ? (list.find((item: ProductWithImages) => item.id !== normalizedCurrentProductId) ?? null)
    : (list[0] ?? null);

  return preferred ? { ...preferred } : null;
};
