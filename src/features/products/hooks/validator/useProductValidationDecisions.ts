'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
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

const VALIDATION_INSTANCE_SCOPES = [
  'draft_template',
  'product_create',
  'product_edit',
] as const satisfies ProductValidationInstanceScope[];

type ValidationDenyBehaviorOverrides = Partial<
  Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>
>;

type UseProductValidationDecisionArgs = [
  validationInstanceScope: ProductValidationInstanceScope,
  instanceDenyBehavior: unknown,
  patterns: ProductValidationPattern[],
  productId: string | null,
  draftId: string | null,
];

export type ProductValidationDecisionsResult = {
  validationDenyBehaviorOverrides: ValidationDenyBehaviorOverrides;
  setValidationDenyBehaviorOverrides: React.Dispatch<
    React.SetStateAction<ValidationDenyBehaviorOverrides>
  >;
  deniedIssueKeys: Set<string>;
  setDeniedIssueKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  acceptedIssueKeys: Set<string>;
  setAcceptedIssueKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  validationSessionId: string;
  effectiveValidationDenyBehavior: ProductValidationDenyBehavior;
  setValidationDenyBehavior: (
    next:
      | ProductValidationDenyBehavior
      | ((prev: ProductValidationDenyBehavior) => ProductValidationDenyBehavior)
  ) => void;
  getIssueDenyBehavior: (patternId: string) => ProductValidationDenyBehavior;
};

const parseStoredObject = (raw: string | null): Record<string, unknown> | null => {
  if (raw === null || raw === '') return null;
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
};

const readStoredDenyBehaviorOverrides = (): ValidationDenyBehaviorOverrides => {
  if (typeof window === 'undefined') return {};
  try {
    const source = parseStoredObject(
      window.sessionStorage.getItem(VALIDATION_DENY_BEHAVIOR_SESSION_KEY)
    );
    if (source === null) return {};
    const next: ValidationDenyBehaviorOverrides = {};
    for (const scope of VALIDATION_INSTANCE_SCOPES) {
      if (source[scope] !== undefined) {
        next[scope] = normalizeProductValidationDenyBehavior(source[scope]);
      }
    }
    return next;
  } catch (error) {
    logClientError(error);
    return {};
  }
};

const readStoredIssueKeys = (storageKey: string): Set<string> => {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null || raw === '') return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed.filter((entry: unknown): entry is string => typeof entry === 'string' && entry !== '')
    );
  } catch (error) {
    logClientError(error);
    return new Set<string>();
  }
};

const resolveValidationSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  const existing = window.sessionStorage.getItem(VALIDATION_DENY_SESSION_ID_KEY);
  if (existing !== null && existing !== '') return existing;
  const nextId =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `validator-session-${Date.now().toString(36)}`;
  window.sessionStorage.setItem(VALIDATION_DENY_SESSION_ID_KEY, nextId);
  return nextId;
};

const serializeJson = (value: unknown): string => JSON.stringify(value);
const serializeIssueKeys = (value: Set<string>): string => JSON.stringify([...value]);

const useSessionStorageWriter = <TValue,>(
  storageKey: string,
  value: TValue,
  serialize: (value: TValue) => string
): void => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const cleanup = (): void => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
    if (typeof window === 'undefined') return cleanup;
    cleanup();
    timerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(storageKey, serialize(value));
    }, 300);
    return cleanup;
  }, [serialize, storageKey, value]);
};

const usePatternDenyBehaviorOverrideMap = (
  patterns: ProductValidationPattern[]
): Map<string, ProductValidationDenyBehavior | null> =>
  useMemo(
    () =>
      new Map<string, ProductValidationDenyBehavior | null>(
        patterns.map((pattern: ProductValidationPattern) => [
          pattern.id,
          normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride),
        ])
      ),
    [patterns]
  );

const useValidationDenyBehaviorSetter = (input: {
  configuredInstanceDenyBehavior: Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>;
  validationInstanceScope: ProductValidationInstanceScope;
  setValidationDenyBehaviorOverrides: React.Dispatch<
    React.SetStateAction<ValidationDenyBehaviorOverrides>
  >;
}): ProductValidationDecisionsResult['setValidationDenyBehavior'] => {
  const {
    configuredInstanceDenyBehavior,
    setValidationDenyBehaviorOverrides,
    validationInstanceScope,
  } = input;
  return useCallback(
    (next): void => {
      setValidationDenyBehaviorOverrides((prev) => {
        const current =
          prev[validationInstanceScope] ?? configuredInstanceDenyBehavior[validationInstanceScope];
        const resolved = typeof next === 'function' ? next(current) : next;
        const normalized = normalizeProductValidationDenyBehavior(resolved);
        if (normalized === current && prev[validationInstanceScope] === normalized) return prev;
        return {
          ...prev,
          [validationInstanceScope]: normalized,
        };
      });
    },
    [configuredInstanceDenyBehavior, setValidationDenyBehaviorOverrides, validationInstanceScope]
  );
};

export function useProductValidationDecisions(
  ...args: UseProductValidationDecisionArgs
): ProductValidationDecisionsResult {
  const [validationInstanceScope, instanceDenyBehavior, patterns] = args;
  const [validationDenyBehaviorOverrides, setValidationDenyBehaviorOverrides] =
    useState<ValidationDenyBehaviorOverrides>(readStoredDenyBehaviorOverrides);
  const [deniedIssueKeys, setDeniedIssueKeys] = useState<Set<string>>(() =>
    readStoredIssueKeys(VALIDATION_DENIED_ISSUES_SESSION_KEY)
  );
  const [acceptedIssueKeys, setAcceptedIssueKeys] = useState<Set<string>>(() =>
    readStoredIssueKeys(VALIDATION_ACCEPTED_ISSUES_SESSION_KEY)
  );
  const [validationSessionId] = useState<string>(resolveValidationSessionId);

  useSessionStorageWriter(
    VALIDATION_DENY_BEHAVIOR_SESSION_KEY,
    validationDenyBehaviorOverrides,
    serializeJson
  );
  useSessionStorageWriter(VALIDATION_DENIED_ISSUES_SESSION_KEY, deniedIssueKeys, serializeIssueKeys);
  useSessionStorageWriter(
    VALIDATION_ACCEPTED_ISSUES_SESSION_KEY,
    acceptedIssueKeys,
    serializeIssueKeys
  );

  const configuredInstanceDenyBehavior =
    normalizeProductValidationInstanceDenyBehaviorMap(instanceDenyBehavior);
  const effectiveValidationDenyBehavior =
    validationDenyBehaviorOverrides[validationInstanceScope] ??
    configuredInstanceDenyBehavior[validationInstanceScope];
  const patternDenyBehaviorOverrideById = usePatternDenyBehaviorOverrideMap(patterns);
  const setValidationDenyBehavior = useValidationDenyBehaviorSetter({
    configuredInstanceDenyBehavior,
    validationInstanceScope,
    setValidationDenyBehaviorOverrides,
  });
  const getIssueDenyBehavior = useCallback(
    (patternId: string): ProductValidationDenyBehavior => {
      const normalizedPatternId = patternId.trim();
      if (normalizedPatternId === '') return effectiveValidationDenyBehavior;
      return patternDenyBehaviorOverrideById.get(normalizedPatternId) ?? effectiveValidationDenyBehavior;
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
