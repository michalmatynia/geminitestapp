'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationAcceptIssueInput,
  ProductValidationDenyIssueInput,
} from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import {
  normalizeProductValidationDenyBehavior,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationPatternDenyBehaviorOverride,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  VALIDATION_ACCEPTED_ISSUES_SESSION_KEY,
  VALIDATION_DENIED_ISSUES_SESSION_KEY,
  VALIDATION_DENY_BEHAVIOR_SESSION_KEY,
  VALIDATION_DENY_SESSION_ID_KEY,
} from './validator-utils';

export function useProductValidationDecisions(
  validationInstanceScope: ProductValidationInstanceScope,
  instanceDenyBehavior: any,
  patterns: ProductValidationPattern[],
  productId: string | null,
  draftId: string | null
) {
  const [validationDenyBehaviorOverrides, setValidationDenyBehaviorOverrides] = useState<
    Partial<Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>>
  >(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.sessionStorage.getItem(VALIDATION_DENY_BEHAVIOR_SESSION_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      const source = parsed as Partial<Record<ProductValidationInstanceScope, unknown>>;
      const next: Partial<Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>> = {};
      if (source['draft_template'] !== undefined) {
        next['draft_template'] = normalizeProductValidationDenyBehavior(source['draft_template']);
      }
      if (source['product_create'] !== undefined) {
        next['product_create'] = normalizeProductValidationDenyBehavior(source['product_create']);
      }
      if (source['product_edit'] !== undefined) {
        next['product_edit'] = normalizeProductValidationDenyBehavior(source['product_edit']);
      }
      return next;
    } catch (error) {
      logClientError(error);
      return {};
    }
  });

  const [deniedIssueKeys, setDeniedIssueKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const raw = window.sessionStorage.getItem(VALIDATION_DENIED_ISSUES_SESSION_KEY);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0));
    } catch (error) {
      logClientError(error);
      return new Set<string>();
    }
  });

  const [acceptedIssueKeys, setAcceptedIssueKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const raw = window.sessionStorage.getItem(VALIDATION_ACCEPTED_ISSUES_SESSION_KEY);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0));
    } catch (error) {
      logClientError(error);
      return new Set<string>();
    }
  });

  const [validationSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.sessionStorage.getItem(VALIDATION_DENY_SESSION_ID_KEY);
    if (existing) return existing;
    const nextId =
      typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `validator-session-${Date.now().toString(36)}`;
    window.sessionStorage.setItem(VALIDATION_DENY_SESSION_ID_KEY, nextId);
    return nextId;
  });

  const denyBehaviorWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deniedIssuesWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptedIssuesWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (denyBehaviorWriteTimerRef.current) clearTimeout(denyBehaviorWriteTimerRef.current);
    denyBehaviorWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(VALIDATION_DENY_BEHAVIOR_SESSION_KEY, JSON.stringify(validationDenyBehaviorOverrides));
    }, 300);
    return () => { if (denyBehaviorWriteTimerRef.current) clearTimeout(denyBehaviorWriteTimerRef.current); };
  }, [validationDenyBehaviorOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (deniedIssuesWriteTimerRef.current) clearTimeout(deniedIssuesWriteTimerRef.current);
    deniedIssuesWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(VALIDATION_DENIED_ISSUES_SESSION_KEY, JSON.stringify([...deniedIssueKeys]));
    }, 300);
    return () => { if (deniedIssuesWriteTimerRef.current) clearTimeout(deniedIssuesWriteTimerRef.current); };
  }, [deniedIssueKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (acceptedIssuesWriteTimerRef.current) clearTimeout(acceptedIssuesWriteTimerRef.current);
    acceptedIssuesWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(VALIDATION_ACCEPTED_ISSUES_SESSION_KEY, JSON.stringify([...acceptedIssueKeys]));
    }, 300);
    return () => { if (acceptedIssuesWriteTimerRef.current) clearTimeout(acceptedIssuesWriteTimerRef.current); };
  }, [acceptedIssueKeys]);

  const configuredInstanceDenyBehavior = normalizeProductValidationInstanceDenyBehaviorMap(instanceDenyBehavior);
  const effectiveValidationDenyBehavior: ProductValidationDenyBehavior =
    validationDenyBehaviorOverrides[validationInstanceScope] ??
    configuredInstanceDenyBehavior[validationInstanceScope];

  const patternDenyBehaviorOverrideById = new Map<string, ProductValidationDenyBehavior | null>(
    (patterns ?? []).map((pattern: ProductValidationPattern) => [
      pattern.id,
      normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride),
    ])
  );

  const setValidationDenyBehavior = useCallback(
    (
      next:
        | ProductValidationDenyBehavior
        | ((prev: ProductValidationDenyBehavior) => ProductValidationDenyBehavior)
    ): void => {
      setValidationDenyBehaviorOverrides(
        (prev: Partial<Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>>) => {
          const current =
            prev[validationInstanceScope] ??
            configuredInstanceDenyBehavior[validationInstanceScope];
          const resolved =
            typeof next === 'function'
              ? (next as (prev: ProductValidationDenyBehavior) => ProductValidationDenyBehavior)(
                current
              )
              : next;
          const normalized = normalizeProductValidationDenyBehavior(resolved);
          if (normalized === current && prev[validationInstanceScope] === normalized) {
            return prev;
          }
          return {
            ...prev,
            [validationInstanceScope]: normalized,
          };
        }
      );
    },
    [configuredInstanceDenyBehavior, validationInstanceScope]
  );

  const getIssueDenyBehavior = useCallback(
    (patternId: string): ProductValidationDenyBehavior => {
      const normalizedPatternId = patternId.trim();
      if (!normalizedPatternId) return effectiveValidationDenyBehavior;
      const override = patternDenyBehaviorOverrideById.get(normalizedPatternId);
      return override ?? effectiveValidationDenyBehavior;
    },
    [effectiveValidationDenyBehavior, patternDenyBehaviorOverrideById]
  );

  return {
    validationDenyBehaviorOverrides,
    setValidationDenyBehaviorOverrides,
    deniedIssueKeys,
    setDeniedIssueKeys,
    acceptedIssueKeys,
    setAcceptedIssueKeys,
    validationSessionId,
    effectiveValidationDenyBehavior,
    setValidationDenyBehavior,
    getIssueDenyBehavior,
  };
}
