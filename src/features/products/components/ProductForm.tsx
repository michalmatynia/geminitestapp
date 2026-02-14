'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DebugPanel from '@/features/products/components/DebugPanel';
import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { ProductValidationSettingsProvider } from '@/features/products/context/ProductValidationSettingsContext';
import { useProductValidatorConfig } from '@/features/products/hooks/useProductSettingsQueries';
import {
  normalizeProductValidationDenyBehavior,
  normalizeProductValidationInstanceDenyBehaviorMap,
  normalizeProductValidationPatternDenyBehaviorOverride,
} from '@/features/products/utils/validator-instance-behavior';
import { api } from '@/shared/lib/api-client';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationInstanceScope,
  ProductValidationPattern,
  ProductValidationPostAcceptBehavior,
} from '@/shared/types/domain/products';
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
    product,
    draft,
  } = useProductFormContext();
  
  const searchParams = useSearchParams();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const validatorConfigQuery = useProductValidatorConfig();
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
      new Map(
        (validatorConfigQuery.data?.patterns ?? []).map((pattern: ProductValidationPattern) => [
          pattern.id,
          normalizeProductValidationPatternDenyBehaviorOverride(pattern.denyBehaviorOverride),
        ])
      ),
    [validatorConfigQuery.data?.patterns]
  );

  useEffect(() => {
    setIsDebugOpen(searchParams.get('debug') === 'true');
  }, [searchParams]);

  useEffect(() => {
    if (!draft) return;
    const nextValidatorEnabled = draft.validatorEnabled ?? true;
    setValidatorEnabled(nextValidatorEnabled);
    setFormatterEnabled(nextValidatorEnabled ? (draft.formatterEnabled ?? false) : false);
    setValidatorInitialized(true);
    setValidatorManuallyChanged(false);
  }, [draft?.id, draft?.validatorEnabled, draft?.formatterEnabled]);

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
    setValidatorEnabled(enabledByDefault);
    setValidatorInitialized(true);
  }, [
    validatorConfigQuery.data?.enabledByDefault,
    validatorInitialized,
    validatorManuallyChanged,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      VALIDATION_DENY_BEHAVIOR_SESSION_KEY,
      JSON.stringify(validationDenyBehaviorOverrides)
    );
  }, [validationDenyBehaviorOverrides]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      VALIDATION_DENIED_ISSUES_SESSION_KEY,
      JSON.stringify([...deniedIssueKeys])
    );
  }, [deniedIssueKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(
      VALIDATION_ACCEPTED_ISSUES_SESSION_KEY,
      JSON.stringify([...acceptedIssueKeys])
    );
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
      const override = patternDenyBehaviorOverrideById.get(normalizedPatternId);
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
        }}
      >
        <Tabs defaultValue='general' className='w-full'>
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
          <TabsContent value='general' className='mt-4'>
            <ProductFormGeneral />
          </TabsContent>
          <TabsContent value='other' className='mt-4'>
            <ProductFormOther />
          </TabsContent>
          <TabsContent value='parameters' className='mt-4'>
            <ProductFormParameters />
          </TabsContent>
          <TabsContent value='images' className='mt-4'>
            <ProductFormImages />
          </TabsContent>
          <TabsContent value='studio' className='mt-4'>
            <ProductFormStudio />
          </TabsContent>
          <TabsContent value='import-info' className='mt-4'>
            <ProductFormImportInfo />
          </TabsContent>
          <TabsContent value='note-link' className='mt-4'>
            <ProductFormNoteLink />
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
      {product?.id && (
        <div className='absolute bottom-0 right-0 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors'>
          <span className='mr-1'>ID:</span>
          <span className='font-mono select-all cursor-text' title='Click to select'>
            {product.id}
          </span>
        </div>
      )}
    </form>
  );
}
