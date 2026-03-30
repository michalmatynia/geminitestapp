'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { useFormContext } from 'react-hook-form';

import * as productsApi from '@/features/products/api/products';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormMetadata } from '@/features/products/context/ProductFormMetadataContext';
import {
  applyValidatorFieldReplacement,
  doesValidatorFieldReplacementMatchCurrentValue,
} from '@/features/products/lib/applyValidatorFieldReplacement';
import { buildProductValidationSourceValues } from '@/features/products/lib/validatorSourceFields';
import { getProductValidationFieldChangedAtDependencies } from '@/features/products/lib/validatorTargetAdapters';
import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import { isPatternConfiguredForFormatterAutoApply } from '@/features/products/validation-engine/core';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationAcceptIssueInput,
  ProductValidationDenyIssueInput,
} from '@/shared/contracts/products';
import type { ProductFormData } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { FieldValidatorIssue } from '../validation-engine/core';
import { useProductFormValidatorSettings } from './validator/useProductFormValidatorSettings';
import { useProductValidationDecisions } from './validator/useProductValidationDecisions';
import {
  getOrCreateAutoAcceptedSet,
  clearAutoAcceptedForEntity,
} from './validator/validator-auto-accept-registry';
import { resolveLatestProductValidatorSourceValues } from './validator/validator-utils';

export interface UseProductFormValidatorResult {
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  setValidatorEnabled: (enabled: SetStateAction<boolean>) => void;
  setFormatterEnabled: (enabled: SetStateAction<boolean>) => void;
  validationDenyBehavior: ProductValidationDenyBehavior;
  setValidationDenyBehavior: (behavior: ProductValidationDenyBehavior) => void;
  denyActionLabel: 'Deny' | 'Mute';
  getDenyActionLabel: (patternId: string) => 'Deny' | 'Mute';
  isIssueDenied: (fieldName: string, patternId: string) => boolean;
  denyIssue: (input: ProductValidationDenyIssueInput) => Promise<void>;
  isIssueAccepted: (fieldName: string, patternId: string) => boolean;
  acceptIssue: (input: ProductValidationAcceptIssueInput) => Promise<void>;
  validatorPatterns: ProductValidationPattern[];
  latestProductValues: Record<string, unknown> | null;
  visibleFieldIssues: Record<string, FieldValidatorIssue[]>;
  setValidatorManuallyChanged: (changed: boolean) => void;
}

export function useProductFormValidator(
  scopeOverride?: string,
  validatorSessionKey?: string
): UseProductFormValidatorResult {
  const { product, draft } = useProductFormCore();
  const { categories, selectedCategoryId, setCategoryId, selectedCatalogIds } = useProductFormMetadata();
  const { watch, getValues, setValue } = useFormContext<ProductFormData>();

  const settings = useProductFormValidatorSettings();
  const {
    validatorEnabled,
    formatterEnabled,
    setValidatorEnabled,
    setFormatterEnabled,
    setValidatorEnabledState,
    setFormatterEnabledState,
    setValidatorInitialized,
    setValidatorManuallyChanged,
    configEnabledByDefault,
    defaultValidatorEnabled,
    defaultFormatterEnabled,
    validatorConfigQuery,
  } = settings;

  const entityIdentity = `${product?.id?.trim() ?? ''}::${draft?.id?.trim() ?? ''}::${validatorSessionKey ?? ''}`;
  const lastEntityIdentityRef = useRef<string>(entityIdentity);

  const watchFields = watch([
    'name_en', 'name_pl', 'name_de', 'description_en', 'description_pl', 'description_de',
    'sku', 'price', 'stock', 'weight', 'sizeLength', 'sizeWidth', 'length',
    'supplierName', 'supplierLink', 'priceComment', 'categoryId',
  ]);

  const [draftValidationInstanceId] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `draft-validation-${Date.now().toString(36)}`
  );

  const [productCreateValidationInstanceId] = useState<string>(() =>
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `product-create-validation-${Date.now().toString(36)}`
  );

  const validationInstanceScope = useMemo((): ProductValidationInstanceScope => {
    if (scopeOverride) return scopeOverride as ProductValidationInstanceScope;
    if (product?.id?.trim()) return 'product_edit';
    if (draft?.id?.trim()) return 'draft_template';
    return 'product_create';
  }, [draft?.id, product?.id, scopeOverride]);

  const validatorPatterns = validatorConfigQuery.data?.patterns ?? [];
  
  const decisions = useProductValidationDecisions(
    validationInstanceScope,
    validatorConfigQuery.data?.instanceDenyBehavior ?? null,
    validatorPatterns,
    product?.id ?? null,
    draft?.id ?? null
  );

  const {
    deniedIssueKeys,
    setDeniedIssueKeys,
    acceptedIssueKeys,
    setAcceptedIssueKeys,
    validationSessionId,
    effectiveValidationDenyBehavior,
    setValidationDenyBehavior,
    getIssueDenyBehavior,
  } = decisions;

  const validatorPatternById = useMemo(
    () => new Map<string, ProductValidationPattern>(validatorPatterns.map((p) => [p.id, p])),
    [validatorPatterns]
  );

  const validatorValues = useMemo(
    (): Record<string, unknown> =>
      buildProductValidationSourceValues({
        baseValues: {
          name_en: watchFields[0], name_pl: watchFields[1], name_de: watchFields[2],
          description_en: watchFields[3], description_pl: watchFields[4], description_de: watchFields[5],
          sku: watchFields[6], price: watchFields[7], stock: watchFields[8], weight: watchFields[9],
          sizeLength: watchFields[10], sizeWidth: watchFields[11], length: watchFields[12],
          supplierName: watchFields[13], supplierLink: watchFields[14], priceComment: watchFields[15],
          categoryId: (watchFields[16] as string) ?? '',
        },
        categories,
        selectedCategoryId,
        selectedCatalogIds,
        fallbackCatalogId: product?.catalogId ?? '',
      }),
    [watchFields, categories, selectedCategoryId, selectedCatalogIds, product?.catalogId]
  );

  const needsLatestProductSource = useMemo(
    () =>
      validatorPatterns.some((pattern: ProductValidationPattern) => {
        const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
        return recipe?.sourceMode === 'latest_product_field' || (pattern.launchEnabled && pattern.launchSourceMode === 'latest_product_field');
      }),
    [validatorPatterns]
  );

  const latestProductsQueryKey = QUERY_KEYS.products.validatorLatestProductSource();
  const latestProductsQuery = createListQueryV2({
    queryKey: latestProductsQueryKey,
    queryFn: () => productsApi.getProducts({ page: 1, pageSize: 2 }, undefined, { fresh: true }),
    enabled: validatorEnabled && needsLatestProductSource,
    staleTime: 0,
    meta: {
      source: 'products.hooks.useProductFormValidator',
      operation: 'list',
      resource: 'products.validator.latest-product-source',
      domain: 'products',
      queryKey: latestProductsQueryKey,
      tags: ['products', 'validator', 'latest-product-source'],
      description: 'Loads products validator latest product source.',
    },
  });

  const latestProductValues = useMemo(
    (): Record<string, unknown> | null =>
      resolveLatestProductValidatorSourceValues({
        products: latestProductsQuery.data,
        currentProductId: product?.id ?? null,
        isFetching: latestProductsQuery.isFetching,
      }),
    [latestProductsQuery.data, latestProductsQuery.isFetching, product?.id]
  );

  useEffect(() => {
    if (lastEntityIdentityRef.current === entityIdentity) return;
    const prevIdentity = lastEntityIdentityRef.current;
    lastEntityIdentityRef.current = entityIdentity;
    if (prevIdentity) clearAutoAcceptedForEntity(prevIdentity);
    setValidatorEnabledState(defaultValidatorEnabled);
    setFormatterEnabledState(defaultFormatterEnabled);
    setValidatorInitialized(typeof configEnabledByDefault === 'boolean');
    setValidatorManuallyChanged(false);
  }, [configEnabledByDefault, defaultFormatterEnabled, defaultValidatorEnabled, entityIdentity, setFormatterEnabledState, setValidatorEnabledState, setValidatorInitialized, setValidatorManuallyChanged]);

  const validationScopeKey = useMemo((): string => {
    if (validationInstanceScope === 'product_edit' && product?.id?.trim()) return `product:${product.id.trim()}`;
    if (validationInstanceScope === 'draft_template') return `draft-instance:${draft?.id?.trim() ?? 'draft'}:${draftValidationInstanceId}`;
    return `product-create-instance:${productCreateValidationInstanceId}`;
  }, [product?.id, draft?.id, draftValidationInstanceId, productCreateValidationInstanceId, validationInstanceScope]);

  const buildIssueDecisionKey = useCallback(
    (fieldName: string, patternId: string): string => `${validationScopeKey}::${fieldName}::${patternId}`,
    [validationScopeKey]
  );

  useEffect(() => {
    if (validationInstanceScope !== 'product_create' && validationInstanceScope !== 'draft_template') return;
    const scopePrefix = `${validationScopeKey}::`;
    setDeniedIssueKeys((prev) => {
      const next = new Set<string>();
      let changed = false;
      for (const key of prev) { if (key.startsWith(scopePrefix)) { changed = true; continue; } next.add(key); }
      return changed ? next : prev;
    });
    setAcceptedIssueKeys((prev) => {
      const next = new Set<string>();
      let changed = false;
      for (const key of prev) { if (key.startsWith(scopePrefix)) { changed = true; continue; } next.add(key); }
      return changed ? next : prev;
    });
  }, [setAcceptedIssueKeys, setDeniedIssueKeys, validationInstanceScope, validationScopeKey]);

  const getDenyActionLabel = useCallback((patternId: string): 'Deny' | 'Mute' => getIssueDenyBehavior(patternId) === 'mute_session' ? 'Mute' : 'Deny', [getIssueDenyBehavior]);
  const isIssueDenied = useCallback((fieldName: string, patternId: string): boolean => deniedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)), [buildIssueDecisionKey, deniedIssueKeys]);
  const isIssueAccepted = useCallback((fieldName: string, patternId: string): boolean => acceptedIssueKeys.has(buildIssueDecisionKey(fieldName, patternId)), [acceptedIssueKeys, buildIssueDecisionKey]);

  const { visibleFieldIssues } = useProductValidatorIssues({
    values: validatorValues, runtimeValues: validatorValues, patterns: validatorPatterns, latestProductValues,
    categories, validationScope: validationInstanceScope, validatorEnabled, isIssueDenied, isIssueAccepted,
    resolveChangedAt: (fieldName, timestamps) => getProductValidationFieldChangedAtDependencies(fieldName).reduce((max, dep) => Math.max(max, timestamps[dep] ?? 0), 0),
    source: 'ProductForm',
  });

  const denyIssue = useCallback(async (input: ProductValidationDenyIssueInput): Promise<void> => {
    const patternId = (input.patternId || '').trim();
    const fieldName = (input.fieldName || '').trim();
    if (!patternId || !fieldName) return;
    const issueKey = buildIssueDecisionKey(fieldName, patternId);
    const issueDenyBehavior = getIssueDenyBehavior(patternId);
    if (issueDenyBehavior === 'mute_session') setDeniedIssueKeys((prev) => prev.has(issueKey) ? prev : new Set(prev).add(issueKey));
    void api.post('/api/v2/products/validator-decisions', { action: 'deny', productId: product?.id ?? null, draftId: draft?.id ?? null, patternId, fieldName, denyBehavior: issueDenyBehavior, message: input.message ?? null, replacementValue: input.replacementValue ?? null, sessionId: validationSessionId || null }, { logError: false }).catch(err => logClientError(err));
  }, [buildIssueDecisionKey, draft?.id, getIssueDenyBehavior, product?.id, setDeniedIssueKeys, validationSessionId]);

  const acceptIssue = useCallback(async (input: ProductValidationAcceptIssueInput): Promise<void> => {
    const patternId = (input.patternId || '').trim();
    const fieldName = (input.fieldName || '').trim();
    if (!patternId || !fieldName) return;
    const issueKey = buildIssueDecisionKey(fieldName, patternId);
    const shouldMute = input.postAcceptBehavior === 'stop_after_accept';
    setAcceptedIssueKeys((prev) => shouldMute ? (prev.has(issueKey) ? prev : new Set(prev).add(issueKey)) : (prev.has(issueKey) ? (()=>{const n=new Set(prev); n.delete(issueKey); return n;})() : prev));
    void api.post('/api/v2/products/validator-decisions', { action: 'accept', productId: product?.id ?? null, draftId: draft?.id ?? null, patternId, fieldName, denyBehavior: null, message: input.message ?? null, replacementValue: input.replacementValue ?? null, sessionId: validationSessionId || null }, { logError: false }).catch(err => logClientError(err));
  }, [buildIssueDecisionKey, draft?.id, product?.id, setAcceptedIssueKeys, validationSessionId]);

  const applyAutoReplacementToField = useCallback((fieldName: string, val: string) => applyValidatorFieldReplacement({ fieldName, replacementValue: val, categories, getCurrentFieldValue: (f) => getValues(f), setFormFieldValue: (f, v) => setValue(f, v, { shouldDirty: true, shouldTouch: true }), setCategoryId }), [categories, getValues, setCategoryId, setValue]);
  const doesAutoReplacementMatchField = useCallback((fieldName: string, val: string) => doesValidatorFieldReplacementMatchCurrentValue({ fieldName, replacementValue: val, categories, getCurrentFieldValue: (f) => getValues(f), setFormFieldValue: ()=>{}, setCategoryId: ()=>{} }), [categories, getValues]);

  const autoAcceptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAcceptedIssueKeysRef = useRef<Set<string>>(getOrCreateAutoAcceptedSet(entityIdentity));
  useEffect(() => { autoAcceptedIssueKeysRef.current = getOrCreateAutoAcceptedSet(entityIdentity); }, [entityIdentity]);

  useEffect(() => {
    if (!validatorEnabled || !formatterEnabled) { if (autoAcceptTimerRef.current) { clearTimeout(autoAcceptTimerRef.current); autoAcceptTimerRef.current = null; } if (autoAcceptedIssueKeysRef.current.size > 0) autoAcceptedIssueKeysRef.current.clear(); return; }
    if (autoAcceptTimerRef.current) clearTimeout(autoAcceptTimerRef.current);
    autoAcceptTimerRef.current = setTimeout(() => {
      autoAcceptTimerRef.current = null;
      const nextVisibleIssueKeys = new Set<string>();
      interface PendingAccept {
        fieldName: string;
        patternId: string;
        postAcceptBehavior: string | null | undefined;
        message: string;
        replacementValue: string | null | undefined;
        issueKey: string;
      }
      const pendingAccepts: PendingAccept[] = [];
      for (const [fieldName, issues] of Object.entries(visibleFieldIssues)) {
        for (const issue of issues) {
          const issueKey = buildIssueDecisionKey(fieldName, issue.patternId);
          nextVisibleIssueKeys.add(issueKey);
          const pattern = validatorPatternById.get(issue.patternId);
          const shouldAutoApply = pattern && isPatternConfiguredForFormatterAutoApply({ pattern, fieldName, validationScope: validationInstanceScope }) && typeof issue.replacementValue === 'string' && issue.replacementValue.trim().length > 0;
          if (autoAcceptedIssueKeysRef.current.has(issueKey)) { if (shouldAutoApply && !doesAutoReplacementMatchField(fieldName, issue.replacementValue ?? '')) autoAcceptedIssueKeysRef.current.delete(issueKey); else continue; }
          if (shouldAutoApply) { if (!applyAutoReplacementToField(fieldName, issue.replacementValue ?? '')) continue; }
          pendingAccepts.push({ fieldName, patternId: issue.patternId, postAcceptBehavior: issue.postAcceptBehavior, message: issue.message, replacementValue: issue.replacementValue, issueKey });
          autoAcceptedIssueKeysRef.current.add(issueKey);
        }
      }
      if (pendingAccepts.length > 0) {
        setAcceptedIssueKeys((prev) => { const next = new Set(prev); for (const a of pendingAccepts) if (a.postAcceptBehavior === 'stop_after_accept') next.add(a.issueKey); return next; });
        void api.post('/api/v2/products/validator-decisions/batch', { decisions: pendingAccepts.map((a: PendingAccept) => ({ action: 'accept', productId: product?.id ?? null, draftId: draft?.id ?? null, patternId: a.patternId, fieldName: a.fieldName, denyBehavior: null, message: a.message ?? null, replacementValue: a.replacementValue ?? null, sessionId: validationSessionId || null })) }, { logError: false }).catch(err => logClientError(err));
      }
      const staleKeys: string[] = [];
      for (const k of autoAcceptedIssueKeysRef.current) if (!nextVisibleIssueKeys.has(k)) staleKeys.push(k);
      staleKeys.forEach(k => autoAcceptedIssueKeysRef.current.delete(k));
    }, 200);
    return () => { if (autoAcceptTimerRef.current) clearTimeout(autoAcceptTimerRef.current); };
  }, [applyAutoReplacementToField, buildIssueDecisionKey, doesAutoReplacementMatchField, draft?.id, formatterEnabled, product?.id, setAcceptedIssueKeys, validationSessionId, validationInstanceScope, validatorPatternById, validatorEnabled, visibleFieldIssues]);

  return {
    validationInstanceScope, validatorEnabled, formatterEnabled, setValidatorEnabled, setFormatterEnabled,
    validationDenyBehavior: effectiveValidationDenyBehavior, setValidationDenyBehavior,
    denyActionLabel: effectiveValidationDenyBehavior === 'mute_session' ? 'Mute' : 'Deny',
    getDenyActionLabel, isIssueDenied, denyIssue, isIssueAccepted, acceptIssue,
    validatorPatterns, latestProductValues, visibleFieldIssues, setValidatorManuallyChanged,
  };
}
