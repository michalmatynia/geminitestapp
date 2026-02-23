'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import * as productsApi from '@/features/products/api/products';
import DebugPanel from '@/features/products/components/DebugPanel';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import {
  normalizeProductValidationDenyBehavior,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationPatternDenyBehaviorOverride,
} from '@/features/products/utils/validator-instance-behavior';
import { parseDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';
import { ProductFormData } from '@/shared/contracts/products';
import {
  PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS,
  type ProductDraftOpenFormTab,
} from '@/shared/contracts/products';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
} from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Tabs, TabsList, TabsTrigger, TabsContent, SelectSimple, ValidatorFormatterToggle } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import ProductFormGeneral from './form/ProductFormGeneral';
import ProductFormImages from './form/ProductFormImages';
import ProductFormImportInfo from './form/ProductFormImportInfo';
import ProductFormNoteLink from './form/ProductFormNoteLink';
import ProductFormOther from './form/ProductFormOther';
import ProductFormParameters from './form/ProductFormParameters';
import ProductFormStudio from './form/ProductFormStudio';

interface ProductFormProps {
  submitButtonText: string;
  skuRequired?: boolean;
  validationInstanceScopeOverride?: ProductValidationInstanceScope;
}

const VALIDATION_DENY_BEHAVIOR_SESSION_KEY = 'product_validation_deny_behavior_by_scope';
const VALIDATION_DENIED_ISSUES_SESSION_KEY = 'product_validation_denied_issues';
const VALIDATION_ACCEPTED_ISSUES_SESSION_KEY = 'product_validation_accepted_issues';
const VALIDATION_DENY_SESSION_ID_KEY = 'product_validation_decision_session_id';
const PRODUCT_FORM_TAB_SET = new Set<string>(PRODUCT_DRAFT_OPEN_FORM_TAB_OPTIONS);
const NUMERIC_AUTO_APPLY_FIELDS = new Set([
  'price',
  'stock',
  'weight',
  'sizeLength',
  'sizeWidth',
  'length',
] as const);

type NumericAutoApplyField = 'price' | 'stock' | 'weight' | 'sizeLength' | 'sizeWidth' | 'length';

const isNumericAutoApplyField = (fieldName: string): fieldName is NumericAutoApplyField =>
  NUMERIC_AUTO_APPLY_FIELDS.has(fieldName as NumericAutoApplyField);

const toComparableFieldString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const normalizeProductFormTab = (value: unknown): ProductDraftOpenFormTab => {
  if (typeof value !== 'string') return 'general';
  const trimmed = value.trim();
  if (trimmed === 'custom-fields') return 'parameters';
  if (!PRODUCT_FORM_TAB_SET.has(trimmed)) return 'general';
  return trimmed as ProductDraftOpenFormTab;
};

const extractNameEnSegment = (value: string, segmentIndex: number): string => {
  if (!value.trim()) return '';
  const parts = value.split('|').map((part: string) => part.trim());
  if (parts.length < segmentIndex + 1) return '';
  return parts[segmentIndex] ?? '';
};

const escapeRegexSegment = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * This component renders the product form fields and handles user interactions.
 * It consumes the ProductFormContext to access state and functions.
 * @param submitButtonText - The text to display on the submit button.
 */
export default function ProductForm({
  submitButtonText: _submitButtonText,
  skuRequired: _skuRequired = false,
  validationInstanceScopeOverride,
}: ProductFormProps): React.JSX.Element {
  const {
    handleSubmit,
    categories,
    selectedCategoryId,
    setCategoryId,
    selectedCatalogIds,
    product,
    draft,
    ConfirmationModal,
  } = useProductFormContext();
  const { watch, getValues, setValue } = useFormContext<ProductFormData>();

  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProductDraftOpenFormTab>(() =>
    normalizeProductFormTab(draft?.openProductFormTab)
  );
  // Deferred tab mounting: only mount tab content on first visit to avoid paying
  // render cost for all 8 tabs upfront. The 'general' tab is always pre-mounted
  // because the formatter effect depends on its fields from the first render.
  // The initial active tab (e.g. from a draft link) is also pre-mounted so the
  // user sees content immediately on load.
  const [mountedTabs, setMountedTabs] = useState<Set<ProductDraftOpenFormTab>>(() => {
    const initial = new Set<ProductDraftOpenFormTab>(['general']);
    const startTab = normalizeProductFormTab(draft?.openProductFormTab);
    initial.add(startTab);
    return initial;
  });
  const validatorConfigQuery = useProductValidatorConfig();

  // Subscribe to only the fields that validators and the nameEn segment extraction
  // actually need. This prevents re-renders (and downstream useMemo cascades) from
  // unrelated field changes such as parameters, imageLinks or imageBase64s.
  const [
    nameEn, namePl, nameDe,
    descEn, descPl, descDe,
    sku, price, stock,
    weight, sizeLength, sizeWidth, formLength,
    supplierName, supplierLink, priceComment,
    formCategoryId,
  ] = watch([
    'name_en', 'name_pl', 'name_de',
    'description_en', 'description_pl', 'description_de',
    'sku', 'price', 'stock',
    'weight', 'sizeLength', 'sizeWidth', 'length',
    'supplierName', 'supplierLink', 'priceComment',
    'categoryId',
  ]);
  const [validatorEnabled, setValidatorEnabled] = useState<boolean>(() => draft?.validatorEnabled ?? true);
  const [formatterEnabled, setFormatterEnabled] = useState<boolean>(
    () => ((draft?.validatorEnabled ?? true) ? (draft?.formatterEnabled ?? false) : false)
  );
  const [validatorInitialized, setValidatorInitialized] = useState<boolean>(
    () => typeof draft?.validatorEnabled === 'boolean'
  );
  const [validatorManuallyChanged, setValidatorManuallyChanged] = useState(false);
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
    } catch {
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
      return new Set(
        parsed.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0)
      );
    } catch {
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
      return new Set(
        parsed.filter((entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0)
      );
    } catch {
      return new Set<string>();
    }
  });
  const [validationSessionId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const existing = window.sessionStorage.getItem(VALIDATION_DENY_SESSION_ID_KEY);
    if (existing) return existing;
    const nextId =
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `validator-session-${Date.now().toString(36)}`;
    window.sessionStorage.setItem(VALIDATION_DENY_SESSION_ID_KEY, nextId);
    return nextId;
  });
  const footerEntityId = product?.id?.trim() || draft?.id?.trim() || '';
  const handleCopyProductId = useCallback(async (): Promise<void> => {
    if (!footerEntityId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(footerEntityId);
    } catch {
      // Ignore clipboard failures to keep form interactions non-blocking.
    }
  }, [footerEntityId]);
  const [draftValidationInstanceId] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `draft-validation-${Date.now().toString(36)}`
  );
  const [productCreateValidationInstanceId] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `product-create-validation-${Date.now().toString(36)}`
  );
  const inferredValidationInstanceScope = useMemo((): ProductValidationInstanceScope => {
    if (product?.id?.trim()) return 'product_edit';
    if (draft?.id?.trim()) return 'draft_template';
    return 'product_create';
  }, [draft?.id, product?.id]);
  const validationInstanceScope = validationInstanceScopeOverride ?? inferredValidationInstanceScope;
  const configuredInstanceDenyBehavior = useMemo(
    (): ProductValidationInstanceDenyBehaviorMap =>
      normalizeProductValidationInstanceDenyBehaviorMap(
        validatorConfigQuery.data?.instanceDenyBehavior ?? null
      ),
    [validatorConfigQuery.data?.instanceDenyBehavior]
  );
  const effectiveValidationDenyBehavior: ProductValidationDenyBehavior =
    validationDenyBehaviorOverrides[validationInstanceScope] ??
    configuredInstanceDenyBehavior[validationInstanceScope];
  const patternDenyBehaviorOverrideById = useMemo(
    () =>
      new Map<string, ProductValidationDenyBehavior>(
        (validatorConfigQuery.data?.patterns ?? []).map((pattern: ProductValidationPattern) => [
          pattern.id,
          normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride),
        ])
      ),
    [validatorConfigQuery.data?.patterns]
  );
  const validatorPatterns = validatorConfigQuery.data?.patterns ?? [];
  const validatorPatternById = useMemo(
    () =>
      new Map<string, ProductValidationPattern>(
        validatorPatterns.map((pattern: ProductValidationPattern) => [pattern.id, pattern])
      ),
    [validatorPatterns]
  );
  const primaryCatalogId = useMemo((): string => {
    const selected = selectedCatalogIds[0]?.trim() ?? '';
    if (selected) return selected;
    const fallback = typeof product?.catalogId === 'string' ? product.catalogId.trim() : '';
    return fallback;
  }, [product?.catalogId, selectedCatalogIds]);
  const selectedCategoryName = useMemo((): string => {
    if (!selectedCategoryId) return '';
    const category =
      categories.find((item) => item.id === selectedCategoryId) ?? null;
    return category?.name?.trim() ?? '';
  }, [categories, selectedCategoryId]);
  const nameEnSegment4 = useMemo(
    () => extractNameEnSegment(String(nameEn ?? ''), 3),
    [nameEn]
  );
  const nameEnSegment4RegexEscaped = useMemo(
    () => escapeRegexSegment(nameEnSegment4),
    [nameEnSegment4]
  );
  // Build the values object the validator engine receives. Only includes fields
  // that validator patterns can target — complex array fields (parameters,
  // imageLinks, imageBase64s) are intentionally excluded since no pattern targets them.
  const validatorValues = useMemo(
    (): Record<string, unknown> => ({
      name_en: nameEn,
      name_pl: namePl,
      name_de: nameDe,
      description_en: descEn,
      description_pl: descPl,
      description_de: descDe,
      sku,
      price,
      stock,
      weight,
      sizeLength,
      sizeWidth,
      length: formLength,
      supplierName,
      supplierLink,
      priceComment,
      categoryId: selectedCategoryId ?? formCategoryId ?? '',
      categoryName: selectedCategoryName,
      primaryCatalogId,
      nameEnSegment4,
      nameEnSegment4RegexEscaped,
    }),
    [
      nameEn, namePl, nameDe,
      descEn, descPl, descDe,
      sku, price, stock,
      weight, sizeLength, sizeWidth, formLength,
      supplierName, supplierLink, priceComment,
      formCategoryId,
      nameEnSegment4,
      nameEnSegment4RegexEscaped,
      primaryCatalogId,
      selectedCategoryId,
      selectedCategoryName,
    ]
  );
  const needsLatestProductSource = useMemo(
    () =>
      validatorPatterns.some((pattern: ProductValidationPattern) => {
        const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
        return (
          recipe?.sourceMode === 'latest_product_field' ||
          (pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field')
        );
      }),
    [validatorPatterns]
  );
  const latestProductsQuery = createListQueryV2({
    queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
    queryFn: () => productsApi.getProducts({ page: 1, pageSize: 4 }),
    enabled: validatorEnabled && needsLatestProductSource,
    staleTime: 60_000,
    meta: {
      source: 'products.components.ProductForm.latestProducts',
      operation: 'list',
      resource: 'products.validator.latest-product-source',
      domain: 'products',
      queryKey: QUERY_KEYS.products.validatorLatestProductSource(),
      tags: ['products', 'validator', 'latest-source'],
    },
  });
  const latestProductValues = useMemo((): Record<string, unknown> | null => {
    const list = latestProductsQuery.data ?? [];
    if (list.length === 0) return null;
    const preferred = list.find((item) => item.id !== product?.id) ?? list[0] ?? null;
    return preferred as unknown as Record<string, unknown>;
  }, [latestProductsQuery.data, product?.id]);

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    const requestedTab = searchParams.get('openProductTab');
    if (requestedTab && requestedTab.trim().length > 0) {
      setActiveTab(normalizeProductFormTab(requestedTab));
      return;
    }
    setActiveTab(normalizeProductFormTab(draft?.openProductFormTab));
  }, [draft?.id, draft?.openProductFormTab, searchParams]);

  useEffect(() => {
    if (draft) {
      const nextValidatorEnabled = draft.validatorEnabled ?? true;
      setValidatorEnabled(nextValidatorEnabled);
      setFormatterEnabled(nextValidatorEnabled ? (draft.formatterEnabled ?? false) : false);
      setValidatorInitialized(true);
      setValidatorManuallyChanged(false);
      return;
    }

    // Non-draft forms should reset per entity instance and let global defaults initialize once.
    setValidatorEnabled(true);
    setFormatterEnabled(false);
    setValidatorInitialized(false);
    setValidatorManuallyChanged(false);
  }, [draft?.id, product?.id]);

  useEffect(() => {
    if (validatorEnabled) return;
    if (!formatterEnabled) return;
    setFormatterEnabled(false);
  }, [validatorEnabled, formatterEnabled]);

  useEffect(() => {
    if (validatorInitialized) return;
    if (validatorManuallyChanged) return;
    const enabledByDefault = validatorConfigQuery.data?.enabledByDefault;
    if (typeof enabledByDefault !== 'boolean') return;
    const formatterEnabledByDefault = validatorConfigQuery.data?.formatterEnabledByDefault;
    setValidatorEnabled(enabledByDefault);
    setFormatterEnabled(
      enabledByDefault
        ? (typeof formatterEnabledByDefault === 'boolean'
          ? formatterEnabledByDefault
          : false)
        : false
    );
    setValidatorInitialized(true);
  }, [
    validatorConfigQuery.data?.enabledByDefault,
    validatorConfigQuery.data?.formatterEnabledByDefault,
    validatorInitialized,
    validatorManuallyChanged,
  ]);

  // Debounce refs for sessionStorage writes. sessionStorage is only read on
  // mount, so a 300ms write delay is imperceptible while removing synchronous
  // main-thread I/O from every deny/accept action.
  const denyBehaviorWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deniedIssuesWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptedIssuesWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAcceptedIssueKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (denyBehaviorWriteTimerRef.current) clearTimeout(denyBehaviorWriteTimerRef.current);
    denyBehaviorWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(
        VALIDATION_DENY_BEHAVIOR_SESSION_KEY,
        JSON.stringify(validationDenyBehaviorOverrides)
      );
    }, 300);
    return () => {
      if (denyBehaviorWriteTimerRef.current) clearTimeout(denyBehaviorWriteTimerRef.current);
    };
  }, [validationDenyBehaviorOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (deniedIssuesWriteTimerRef.current) clearTimeout(deniedIssuesWriteTimerRef.current);
    deniedIssuesWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(
        VALIDATION_DENIED_ISSUES_SESSION_KEY,
        JSON.stringify([...deniedIssueKeys])
      );
    }, 300);
    return () => {
      if (deniedIssuesWriteTimerRef.current) clearTimeout(deniedIssuesWriteTimerRef.current);
    };
  }, [deniedIssueKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (acceptedIssuesWriteTimerRef.current) clearTimeout(acceptedIssuesWriteTimerRef.current);
    acceptedIssuesWriteTimerRef.current = setTimeout(() => {
      window.sessionStorage.setItem(
        VALIDATION_ACCEPTED_ISSUES_SESSION_KEY,
        JSON.stringify([...acceptedIssueKeys])
      );
    }, 300);
    return () => {
      if (acceptedIssuesWriteTimerRef.current) clearTimeout(acceptedIssuesWriteTimerRef.current);
    };
  }, [acceptedIssueKeys]);

  const validationScopeKey = useMemo((): string => {
    if (validationInstanceScope === 'product_edit' && product?.id?.trim()) {
      return `product:${product.id.trim()}`;
    }
    if (validationInstanceScope === 'draft_template') {
      const draftId = draft?.id?.trim() ?? 'draft';
      return `draft-instance:${draftId}:${draftValidationInstanceId}`;
    }
    return `product-create-instance:${productCreateValidationInstanceId}`;
  }, [
    product?.id,
    draft?.id,
    draftValidationInstanceId,
    productCreateValidationInstanceId,
    validationInstanceScope,
  ]);

  const buildIssueDecisionKey = useCallback(
    (fieldName: string, patternId: string): string =>
      `${validationScopeKey}::${fieldName}::${patternId}`,
    [validationScopeKey]
  );

  useEffect(() => {
    if (
      validationInstanceScope !== 'product_create' &&
      validationInstanceScope !== 'draft_template'
    ) {
      return;
    }
    const scopePrefix = `${validationScopeKey}::`;
    setDeniedIssueKeys((prev: Set<string>) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (key.startsWith(scopePrefix)) {
          changed = true;
          continue;
        }
        next.add(key);
      }
      return changed ? next : prev;
    });
    setAcceptedIssueKeys((prev: Set<string>) => {
      let changed = false;
      const next = new Set<string>();
      for (const key of prev) {
        if (key.startsWith(scopePrefix)) {
          changed = true;
          continue;
        }
        next.add(key);
      }
      return changed ? next : prev;
    });
  }, [validationInstanceScope, validationScopeKey]);

  const setValidationDenyBehavior = useCallback(
    (next: ProductValidationDenyBehavior | ((prev: ProductValidationDenyBehavior) => ProductValidationDenyBehavior)): void => {
      setValidationDenyBehaviorOverrides((
        prev: Partial<Record<ProductValidationInstanceScope, ProductValidationDenyBehavior>>
      ) => {
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
      });
    },
    [configuredInstanceDenyBehavior, validationInstanceScope]
  );

  const getIssueDenyBehavior = useCallback(
    (patternId: string): ProductValidationDenyBehavior => {
      const normalizedPatternId = patternId.trim();
      if (!normalizedPatternId) return effectiveValidationDenyBehavior;
      const override = patternDenyBehaviorOverrideById.get(
        normalizedPatternId
      );
      return override ?? effectiveValidationDenyBehavior;
    },
    [effectiveValidationDenyBehavior, patternDenyBehaviorOverrideById]
  );

  const getDenyActionLabel = useCallback(
    (patternId: string): 'Deny' | 'Mute' =>
      getIssueDenyBehavior(patternId) === 'mute_session' ? 'Mute' : 'Deny',
    [getIssueDenyBehavior]
  );

  const isIssueDenied = useCallback(
    (fieldName: string, patternId: string): boolean =>
      deniedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)),
    [buildIssueDecisionKey, deniedIssueKeys]
  );

  const isIssueAccepted = useCallback(
    (fieldName: string, patternId: string): boolean =>
      acceptedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)),
    [acceptedIssueKeys, buildIssueDecisionKey]
  );
  const { visibleFieldIssues } = useProductValidatorIssues({
    values: validatorValues,
    runtimeValues: validatorValues,
    patterns: validatorPatterns,
    latestProductValues,
    validationScope: validationInstanceScope,
    validatorEnabled,
    isIssueDenied,
    isIssueAccepted,
    resolveChangedAt: (fieldName: string, timestamps: Record<string, number>): number => {
      if (fieldName === 'categoryId') {
        return Math.max(
          timestamps['categoryId'] ?? 0,
          timestamps['name_en'] ?? 0
        );
      }
      return timestamps[fieldName] ?? 0;
    },
    source: 'ProductForm',
  });

  const denyIssue = useCallback(
    (input: {
      fieldName: string;
      patternId: string;
      message?: string | null;
      replacementValue?: string | null;
    }): void => {
      const patternId = input.patternId.trim();
      const fieldName = input.fieldName.trim();
      if (!patternId || !fieldName) return;
      const issueKey = buildIssueDecisionKey(fieldName, patternId);
      const issueDenyBehavior = getIssueDenyBehavior(patternId);

      if (issueDenyBehavior === 'mute_session') {
        setDeniedIssueKeys((prev: Set<string>) => {
          if (prev.has(issueKey)) return prev;
          const next = new Set(prev);
          next.add(issueKey);
          return next;
        });
      }

      void api
        .post('/api/products/validator-decisions', {
          action: 'deny',
          productId: product?.id ?? null,
          draftId: draft?.id ?? null,
          patternId,
          fieldName,
          denyBehavior: issueDenyBehavior,
          message: input.message ?? null,
          replacementValue: input.replacementValue ?? null,
          sessionId: validationSessionId || null,
        }, {
          logError: false,
        })
        .catch((error: unknown) => {
          logClientError(
            error instanceof Error ? error : new Error(String(error)),
            {
              context: {
                source: 'ProductForm',
                action: 'denyValidatorIssue',
                fieldName,
                patternId,
              },
            }
          );
        });
    },
    [
      buildIssueDecisionKey,
      draft?.id,
      getIssueDenyBehavior,
      product?.id,
      validationSessionId,
    ]
  );

  const acceptIssue = useCallback(
    (input: {
      fieldName: string;
      patternId: string;
      postAcceptBehavior: ProductValidationPostAcceptBehavior;
      message?: string | null;
      replacementValue?: string | null;
    }): void => {
      const patternId = input.patternId.trim();
      const fieldName = input.fieldName.trim();
      if (!patternId || !fieldName) return;
      const issueKey = buildIssueDecisionKey(fieldName, patternId);
      const shouldMuteAfterAccept = input.postAcceptBehavior === 'stop_after_accept';

      setAcceptedIssueKeys((prev: Set<string>) => {
        if (shouldMuteAfterAccept) {
          if (prev.has(issueKey)) return prev;
          const next = new Set(prev);
          next.add(issueKey);
          return next;
        }
        if (!prev.has(issueKey)) return prev;
        const next = new Set(prev);
        next.delete(issueKey);
        return next;
      });

      void api
        .post('/api/products/validator-decisions', {
          action: 'accept',
          productId: product?.id ?? null,
          draftId: draft?.id ?? null,
          patternId,
          fieldName,
          denyBehavior: null,
          message: input.message ?? null,
          replacementValue: input.replacementValue ?? null,
          sessionId: validationSessionId || null,
        }, {
          logError: false,
        })
        .catch((error: unknown) => {
          logClientError(
            error instanceof Error ? error : new Error(String(error)),
            {
              context: {
                source: 'ProductForm',
                action: 'acceptValidatorIssue',
                fieldName,
                patternId,
              },
            }
          );
        });
    },
    [
      buildIssueDecisionKey,
      draft?.id,
      product?.id,
      validationSessionId,
    ]
  );

  const applyAutoReplacementToField = useCallback(
    (fieldName: string, replacementValue: string): boolean => {
      const normalizedReplacement = replacementValue.trim();
      if (!normalizedReplacement) return false;

      if (fieldName === 'categoryId') {
        const currentCategoryValue = toComparableFieldString(getValues('categoryId'));
        if (currentCategoryValue !== normalizedReplacement) {
          setCategoryId(normalizedReplacement);
        }
        return true;
      }

      if (isNumericAutoApplyField(fieldName)) {
        const numericValue = Number(normalizedReplacement.replace(',', '.'));
        if (!Number.isFinite(numericValue)) return false;
        const normalizedNumeric = Math.max(0, Math.floor(numericValue));
        const currentNumeric = getValues(fieldName);
        if (
          typeof currentNumeric !== 'number' ||
          !Number.isFinite(currentNumeric) ||
          currentNumeric !== normalizedNumeric
        ) {
          setValue(fieldName, normalizedNumeric as ProductFormData[typeof fieldName], {
            shouldDirty: true,
            shouldTouch: true,
          });
        }
        return true;
      }

      const formFieldName = fieldName as keyof ProductFormData;
      const currentValue = toComparableFieldString(getValues(formFieldName));
      if (currentValue !== normalizedReplacement) {
        setValue(formFieldName, normalizedReplacement as ProductFormData[keyof ProductFormData], {
          shouldDirty: true,
          shouldTouch: true,
        });
      }
      return true;
    },
    [getValues, setCategoryId, setValue]
  );

  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) {
      if (autoAcceptedIssueKeysRef.current.size > 0) {
        autoAcceptedIssueKeysRef.current.clear();
      }
      return;
    }
    const nextVisibleIssueKeys = new Set<string>();
    for (const [fieldName, issues] of Object.entries(visibleFieldIssues)) {
      for (const issue of issues) {
        const issueKey = buildIssueDecisionKey(fieldName, issue.patternId);
        nextVisibleIssueKeys.add(issueKey);
        if (autoAcceptedIssueKeysRef.current.has(issueKey)) continue;
        const issuePattern = validatorPatternById.get(issue.patternId);
        const shouldAutoApplyRuntimeReplacement =
          issuePattern?.runtimeEnabled === true &&
          issuePattern.replacementAutoApply === true &&
          typeof issue.replacementValue === 'string' &&
          issue.replacementValue.trim().length > 0;
        if (shouldAutoApplyRuntimeReplacement) {
          const applied = applyAutoReplacementToField(fieldName, issue.replacementValue);
          if (!applied) continue;
        }
        acceptIssue({
          fieldName,
          patternId: issue.patternId,
          postAcceptBehavior: issue.postAcceptBehavior,
          message: issue.message,
          replacementValue: issue.replacementValue,
        });
        autoAcceptedIssueKeysRef.current.add(issueKey);
      }
    }
    if (autoAcceptedIssueKeysRef.current.size === 0) return;
    const staleKeys: string[] = [];
    for (const issueKey of autoAcceptedIssueKeysRef.current) {
      if (!nextVisibleIssueKeys.has(issueKey)) {
        staleKeys.push(issueKey);
      }
    }
    staleKeys.forEach((issueKey) => {
      autoAcceptedIssueKeysRef.current.delete(issueKey);
    });
  }, [
    acceptIssue,
    applyAutoReplacementToField,
    buildIssueDecisionKey,
    formatterEnabled,
    validatorPatternById,
    validatorEnabled,
    visibleFieldIssues,
  ]);

  return (
    <form onSubmit={(e: React.FormEvent) => { void handleSubmit(e); }} className='relative min-h-[400px] pb-10'>
      {isDebugOpen && <DebugPanel />}
      <ProductValidationSettingsProvider
        value={{
          validationInstanceScope,
          validatorEnabled,
          formatterEnabled,
          setValidatorEnabled,
          setFormatterEnabled,
          validationDenyBehavior: effectiveValidationDenyBehavior,
          setValidationDenyBehavior,
          denyActionLabel:
            effectiveValidationDenyBehavior === 'mute_session' ? 'Mute' : 'Deny',
          getDenyActionLabel,
          isIssueDenied,
          denyIssue,
          isIssueAccepted,
          acceptIssue,
          validatorPatterns,
          latestProductValues,
          visibleFieldIssues,
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value: string): void => {
            const tab = normalizeProductFormTab(value);
            setActiveTab(tab);
            setMountedTabs((prev) => {
              if (prev.has(tab)) return prev;
              const next = new Set(prev);
              next.add(tab);
              return next;
            });
          }}
          className='w-full'
        >
          <TabsList
            className='grid w-full grid-cols-4 md:grid-cols-8'
          >
            <TabsTrigger value='general'>General</TabsTrigger>
            <TabsTrigger value='other'>Other</TabsTrigger>
            <TabsTrigger value='parameters'>Parameters</TabsTrigger>
            <TabsTrigger value='images'>Images</TabsTrigger>
            <TabsTrigger value='studio'>Studio</TabsTrigger>
            <TabsTrigger value='import-info'>Import Info</TabsTrigger>
            <TabsTrigger value='note-link'>Note Link</TabsTrigger>
            <TabsTrigger value='validation'>Validation</TabsTrigger>
          </TabsList>
          {/* General tab is always mounted — the formatter effect reads its fields from mount */}
          <TabsContent value='general' className='mt-4 data-[state=inactive]:hidden' forceMount>
            <ProductFormGeneral />
          </TabsContent>
          {/* Remaining tabs use deferred mounting: content renders on first visit and */}
          {/* remains hidden via CSS when inactive, avoiding repeated mount/unmount cost. */}
          <TabsContent value='other' className='mt-4 data-[state=inactive]:hidden' forceMount>
            <ProductFormOther />
          </TabsContent>
          <TabsContent value='parameters' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('parameters') && <ProductFormParameters />}
          </TabsContent>
          <TabsContent value='images' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('images') && <ProductFormImages />}
          </TabsContent>
          <TabsContent value='studio' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('studio') && <ProductFormStudio />}
          </TabsContent>
          <TabsContent value='import-info' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('import-info') && <ProductFormImportInfo />}
          </TabsContent>
          <TabsContent value='note-link' className='mt-4 data-[state=inactive]:hidden'>
            {mountedTabs.has('note-link') && <ProductFormNoteLink />}
          </TabsContent>
          <TabsContent value='validation' className='mt-4 space-y-4'>
            <div className='rounded-md border border-border bg-gray-900/70 p-4'>
              <p className='text-sm font-semibold text-white'>Validation Controls</p>
              <p className='mt-1 text-xs text-gray-400'>
                `Validator` enables validation rules. `Formatter` auto-applies rules configured for formatter mode.
              </p>
              <ValidatorFormatterToggle
                className='mt-4'
                validatorEnabled={validatorEnabled}
                formatterEnabled={formatterEnabled}
                onValidatorChange={(next: boolean): void => {
                  setValidatorManuallyChanged(true);
                  setValidatorInitialized(true);
                  setValidatorEnabled(next);
                }}
                onFormatterChange={(next: boolean): void => setFormatterEnabled(next)}
              />
              <div className='mt-4 grid gap-2 md:max-w-sm'>
                <p className='text-xs font-medium text-white'>When a correction is denied</p>
                <SelectSimple size='sm'
                  value={effectiveValidationDenyBehavior}
                  onValueChange={(value: string): void =>
                    setValidationDenyBehavior(
                      value === 'ask_again' ? 'ask_again' : 'mute_session'
                    )
                  }
                  options={[
                    { value: 'mute_session', label: 'Stop For This Session' },
                    { value: 'ask_again', label: 'Ask Again Next Validation' },
                  ]}
                />
                <p className='text-[11px] text-gray-400'>
                  Current context: <span className='font-medium text-gray-300'>{validationInstanceScope}</span>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ProductValidationSettingsProvider>
      {footerEntityId && (
        <button
          type='button'
          className='absolute bottom-0 right-0 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors'
          title='Click to copy ID'
          onClick={() => {
            void handleCopyProductId();
          }}
        >
          {footerEntityId}
        </button>
      )}
      <ConfirmationModal />
    </form>
  );
}
