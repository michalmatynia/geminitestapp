'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  useIntegrationCatalogs,
  useIntegrationProductCategories,
} from '@/features/integrations/hooks/useIntegrationProductQueries';
import {
  useFetchExternalCategoriesMutation,
  useSaveMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalCategories,
  useCategoryMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import {
  autoMatchCategoryMappingsByName,
  formatAutoMatchCategoryMappingsByNameMessage,
} from '@/features/integrations/components/marketplaces/category-mapper/category-table/auto-match-by-name';
import { buildCategoryTree } from '@/features/integrations/components/marketplaces/category-mapper/category-table/utils';
import { isTraderaBrowserIntegrationSlug } from '@/features/integrations/constants/slugs';
import type { ExternalCategory, CategoryMappingWithDetails } from '@/shared/contracts/integrations';
import type {
  InternalCategoryOption,
  CategoryMapperData,
  CategoryMapperActions,
} from '@/shared/contracts/integrations';
import type { CatalogRecord, ProductCategory } from '@/shared/contracts/products';
import { ApiError } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  ensureTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
} from '@/features/integrations/utils/tradera-browser-session';
import { createStrictContext } from './createStrictContext';

// --- Granular Contexts ---

export interface CategoryMapperConfig {
  connectionId: string;
  connectionName: string;
  integrationId?: string | undefined;
  integrationSlug?: string | undefined;
}
export const { Context: ConfigContext, useValue: useCategoryMapperConfig } =
  createStrictContext<CategoryMapperConfig>({
    displayName: 'CategoryMapperConfigContext',
    errorMessage: 'useCategoryMapperConfig must be used within CategoryMapperProvider',
  });

export const { Context: DataContext, useValue: useCategoryMapperData } =
  createStrictContext<CategoryMapperData>({
    displayName: 'CategoryMapperDataContext',
    errorMessage: 'useCategoryMapperData must be used within CategoryMapperProvider',
  });

export interface CategoryMapperUIState {
  pendingMappings: Map<string, string | null>;
  expandedIds: Set<string>;
  toggleExpand: (categoryId: string) => void;
  showTraderaLoginRecoveryModal: boolean;
  traderaLoginRecoveryReason: string | null;
  openingTraderaLoginRecovery: boolean;
  staleMappings: Array<{
    externalCategoryId: string;
    externalCategoryName: string;
    externalCategoryPath: string | null;
    internalCategoryLabel: string | null;
  }>;
  stats: { total: number; mapped: number; unmapped: number; pending: number; stale: number };
}
export const { Context: UIStateContext, useValue: useCategoryMapperUIState } =
  createStrictContext<CategoryMapperUIState>({
    displayName: 'CategoryMapperUIStateContext',
    errorMessage: 'useCategoryMapperUIState must be used within CategoryMapperProvider',
  });

export const { Context: ActionsContext, useValue: useCategoryMapperActions } =
  createStrictContext<CategoryMapperActions>({
    displayName: 'CategoryMapperActionsContext',
    errorMessage: 'useCategoryMapperActions must be used within CategoryMapperProvider',
  });

const TRADERA_CAPTCHA_HINTS = ['captcha', 'recaptcha', 'fylla i captcha', 'captcha:n'] as const;
const TRADERA_MANUAL_VERIFICATION_TEXT_HINTS = [
  ...TRADERA_CAPTCHA_HINTS,
  'verification',
  'verify',
  'manual verification',
  'security check',
  'two-factor',
  '2fa',
  'bankid',
  'engangskod',
  'säkerhetskontroll',
] as const;
const TRADERA_MANUAL_VERIFICATION_URL_HINTS = [
  '/challenge',
  '/captcha',
  '/verify',
  '/verification',
  '/bankid',
  '/two-factor',
  '/2fa',
] as const;

const readTrimmedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const includesAnyHint = (value: string | null, hints: readonly string[]): boolean => {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }

  return hints.some((hint) => normalized.includes(hint.toLowerCase()));
};

const getApiErrorDetails = (error: unknown): Record<string, unknown> | null => {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const details =
    error.payload && typeof error.payload === 'object' && 'details' in error.payload
      ? (error.payload as { details?: unknown }).details
      : null;

  return details && typeof details === 'object' ? (details as Record<string, unknown>) : null;
};

const inferTraderaRecoveryMessageFromDetails = (
  details: Record<string, unknown> | null
): string | null => {
  if (!details) {
    return null;
  }

  const currentUrl = readTrimmedString(details['currentUrl']);
  const errorText = readTrimmedString(details['errorText']) ?? readTrimmedString(details['message']);
  const loginPage = details['loginPage'] === true;
  const captchaDetected =
    details['captchaDetected'] === true ||
    includesAnyHint(errorText, TRADERA_CAPTCHA_HINTS) ||
    includesAnyHint(
      currentUrl,
      TRADERA_MANUAL_VERIFICATION_URL_HINTS.filter((hint) => hint.includes('captcha'))
    );
  const manualVerificationDetected =
    details['manualVerificationDetected'] === true ||
    captchaDetected ||
    includesAnyHint(errorText, TRADERA_MANUAL_VERIFICATION_TEXT_HINTS) ||
    includesAnyHint(currentUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS);

  if (loginPage) {
    return 'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.';
  }

  if (captchaDetected) {
    return 'Stored Tradera session expired and Tradera requires manual verification (captcha). Refresh the saved browser session.';
  }

  if (manualVerificationDetected) {
    return 'Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.';
  }

  return null;
};

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

const isMissingExternalCategoryName = (value: string | null | undefined): boolean => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.startsWith('[Missing external category:');
};

const buildInternalCategoryOptions = (categories: ProductCategory[]): InternalCategoryOption[] => {
  if (categories.length === 0) return [];

  const byId = new Map<string, ProductCategory>(
    categories.map((category: ProductCategory): [string, ProductCategory] => [
      category.id,
      category,
    ])
  );
  const childrenByParentId = new Map<string | null, ProductCategory[]>();

  const pushChild = (parentId: string | null, category: ProductCategory): void => {
    const current = childrenByParentId.get(parentId) ?? [];
    current.push(category);
    childrenByParentId.set(parentId, current);
  };

  for (const category of categories) {
    const rawParentId = typeof category.parentId === 'string' ? category.parentId.trim() : '';
    const normalizedParentId =
      rawParentId.length > 0 && rawParentId !== category.id && byId.has(rawParentId)
        ? rawParentId
        : null;
    pushChild(normalizedParentId, category);
  }

  for (const [, children] of childrenByParentId) {
    children.sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));
  }

  const visited = new Set<string>();
  const options: InternalCategoryOption[] = [];

  const visit = (parentId: string | null, depth: number, ancestry: string[]): void => {
    const children = childrenByParentId.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const path = [...ancestry, child.name];
      const indent = depth > 0 ? `${'\u00A0\u00A0'.repeat(depth)}↳ ` : '';
      options.push({
        value: child.id,
        label: `${indent}${path.join(' / ')}`,
      });
      visit(child.id, depth + 1, path);
    }
  };

  visit(null, 0, []);

  const unvisited = categories
    .filter((category: ProductCategory): boolean => !visited.has(category.id))
    .sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));

  for (const category of unvisited) {
    if (visited.has(category.id)) continue;
    visited.add(category.id);
    options.push({ value: category.id, label: category.name });
    visit(category.id, 1, [category.name]);
  }

  return options;
};

const extractTraderaRecoveryMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  const details = getApiErrorDetails(error);
  if (details) {
    if ('recoveryMessage' in details) {
      const recoveryMessage = readTrimmedString(details['recoveryMessage']);
      if (recoveryMessage) {
        return recoveryMessage;
      }
    }

    if ('logTail' in details && Array.isArray(details['logTail'])) {
      for (const entry of details['logTail']) {
        if (typeof entry !== 'string') {
          continue;
        }
        const normalizedEntry = entry.replace(/^\[runtime\]\[error\]\s*/i, '').trim();
        const authMatch = normalizedEntry.match(/AUTH_REQUIRED:\s*(.+)$/i);
        if (authMatch?.[1]?.trim()) {
          return authMatch[1].trim();
        }
      }
    }

    const inferredRecoveryMessage = inferTraderaRecoveryMessageFromDetails(details);
    if (inferredRecoveryMessage) {
      return inferredRecoveryMessage;
    }
  }

  return fallbackMessage;
};

const isTraderaCategoryFetchAuthError = (
  error: unknown,
  message: string,
  isTraderaBrowserConnection: boolean
): boolean => {
  if (!isTraderaBrowserConnection) {
    return false;
  }

  if (isTraderaBrowserAuthRequiredMessage(message)) {
    return true;
  }

  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 401) {
    return true;
  }

  const details = getApiErrorDetails(error);

  if (
    details &&
    'logTail' in details &&
    Array.isArray(details['logTail'])
  ) {
    const logTail = details['logTail'];
    if (
      logTail.some(
        (entry) =>
          typeof entry === 'string' &&
          (entry.toLowerCase().includes('auth_required') ||
            entry.toLowerCase().includes('session is missing or expired'))
      )
    ) {
      return true;
    }
  }

  if (inferTraderaRecoveryMessageFromDetails(details)) {
    return true;
  }

  return Boolean(
    details &&
      'recoveryAction' in details &&
      details['recoveryAction'] === 'tradera_manual_login'
  );
};

export function CategoryMapperProvider({
  connectionId,
  connectionName,
  integrationId,
  integrationSlug,
  children,
}: {
  connectionId: string;
  connectionName: string;
  integrationId?: string;
  integrationSlug?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();
  const isTraderaBrowserConnection = isTraderaBrowserIntegrationSlug(integrationSlug);

  // Queries
  const catalogsQuery = useIntegrationCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const catalogsLoading = catalogsQuery.isLoading;

  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const hasInitializedCatalog = useRef(false);

  // Auto-select default catalog
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!selectedCatalogId && catalogs.length > 0 && !hasInitializedCatalog.current) {
      const defaultCatalog = catalogs.find((c: CatalogRecord) => c.isDefault) ?? catalogs[0];
      if (defaultCatalog) {
        timer = setTimeout(() => {
          setSelectedCatalogId(defaultCatalog.id);
          hasInitializedCatalog.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogs, selectedCatalogId]);

  const internalCategoriesQuery = useIntegrationProductCategories(selectedCatalogId ?? undefined);
  const internalCategories = internalCategoriesQuery.data ?? [];
  const internalCategoriesLoading = internalCategoriesQuery.isLoading;
  const internalCategoryOptions = useMemo(
    (): InternalCategoryOption[] => buildInternalCategoryOptions(internalCategories),
    [internalCategories]
  );

  const externalCategoriesQuery = useExternalCategories(connectionId);
  const externalCategories = useMemo(
    () => externalCategoriesQuery.data ?? [],
    [externalCategoriesQuery.data]
  );
  const externalCategoriesLoading = externalCategoriesQuery.isLoading;
  const externalIds = useMemo(
    () =>
      new Set(
        externalCategories
          .map((category: ExternalCategory): string => category.externalId.trim())
          .filter((id: string): boolean => id.length > 0)
      ),
    [externalCategories]
  );

  const mappingsQuery = useCategoryMappings(connectionId, selectedCatalogId);
  const mappings = useMemo(() => mappingsQuery.data ?? [], [mappingsQuery.data]);
  const mappingsLoading = mappingsQuery.isLoading;

  // Mutations
  const fetchMutation = useFetchExternalCategoriesMutation();
  const saveMutation = useSaveMappingsMutation();

  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showTraderaLoginRecoveryModal, setShowTraderaLoginRecoveryModal] = useState(false);
  const [traderaLoginRecoveryReason, setTraderaLoginRecoveryReason] = useState<string | null>(
    null
  );
  const [openingTraderaLoginRecovery, setOpeningTraderaLoginRecovery] = useState(false);
  const hasInitializedExpansion = useRef(false);

  const isRootCategory = useCallback(
    (category: ExternalCategory): boolean => {
      const parentExternalId = normalizeParentExternalId(category.parentExternalId);
      if (!parentExternalId) return true;
      if (parentExternalId === category.externalId) return true;
      return !externalIds.has(parentExternalId);
    },
    [externalIds]
  );

  // Initialize expansion state
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (externalCategories.length > 0 && !hasInitializedExpansion.current) {
      timer = setTimeout(() => {
        setExpandedIds((prev: Set<string>) => {
          if (prev.size === 0) {
            return new Set(
              externalCategories
                .filter((c: ExternalCategory) => isRootCategory(c))
                .map((c: ExternalCategory) => c.id)
            );
          }
          return prev;
        });
        hasInitializedExpansion.current = true;
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [externalCategories, isRootCategory]);

  // Reset pending mappings when catalog changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPendingMappings(new Map());
    }, 0);
    return (): void => clearTimeout(timer);
  }, [selectedCatalogId]);

  const closeTraderaLoginRecoveryModal = useCallback((): void => {
    setShowTraderaLoginRecoveryModal(false);
    setTraderaLoginRecoveryReason(null);
  }, []);

  const fetchExternalCategoriesWithRecovery = useCallback(
    async (): Promise<'success' | 'auth_required' | 'error'> => {
      try {
        const result = await fetchMutation.mutateAsync({ connectionId });
        closeTraderaLoginRecoveryModal();
        toast(result.message, { variant: 'success' });
        return 'success';
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'CategoryMapper',
          action: 'fetchExternalCategories',
          connectionId,
          integrationId,
        });

        const message = error instanceof Error ? error.message : 'Failed to fetch categories';
        const recoveryMessage = extractTraderaRecoveryMessage(error, message);
        if (isTraderaCategoryFetchAuthError(error, recoveryMessage, isTraderaBrowserConnection)) {
          setTraderaLoginRecoveryReason(recoveryMessage);
          setShowTraderaLoginRecoveryModal(true);
          return 'auth_required';
        }

        toast(message, { variant: 'error' });
        return 'error';
      }
    },
    [
      closeTraderaLoginRecoveryModal,
      connectionId,
      fetchMutation,
      integrationId,
      isTraderaBrowserConnection,
      toast,
    ]
  );

  const handleFetchExternalCategories = useCallback(async (): Promise<void> => {
    await fetchExternalCategoriesWithRecovery();
  }, [fetchExternalCategoriesWithRecovery]);

  const handleOpenTraderaLoginRecovery = useCallback(async (): Promise<void> => {
    if (!integrationId) {
      const message = 'Tradera integration is missing for this connection.';
      setTraderaLoginRecoveryReason(message);
      toast(message, { variant: 'error' });
      return;
    }

    try {
      setOpeningTraderaLoginRecovery(true);
      const response = await ensureTraderaBrowserSession({
        integrationId,
        connectionId,
      });
      toast(
        response.savedSession
          ? 'Tradera login session refreshed.'
          : 'Tradera manual login completed.',
        { variant: 'success' }
      );

      const result = await fetchExternalCategoriesWithRecovery();
      if (result !== 'auth_required') {
        closeTraderaLoginRecoveryModal();
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoryMapper',
        action: 'openTraderaLoginRecovery',
        connectionId,
        integrationId,
      });
      const message =
        error instanceof Error ? error.message : 'Failed to open Tradera login window';
      setTraderaLoginRecoveryReason(message);
      toast(message, { variant: 'error' });
    } finally {
      setOpeningTraderaLoginRecovery(false);
    }
  }, [
    closeTraderaLoginRecoveryModal,
    connectionId,
    fetchExternalCategoriesWithRecovery,
    integrationId,
    toast,
  ]);

  const getMappingForExternal = useCallback(
    (externalCategoryId: string): string | null => {
      if (pendingMappings.has(externalCategoryId)) {
        return pendingMappings.get(externalCategoryId) ?? null;
      }
      const mapping = mappings.find(
        (m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId
      );
      if (!mapping?.isActive) return null;
      return mapping.internalCategoryId;
    },
    [mappings, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (externalCategoryId: string, internalCategoryId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedMapping = mappings.find(
          (m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId
        );
        const savedValue = savedMapping?.isActive ? savedMapping.internalCategoryId : null;

        if (savedValue === internalCategoryId) {
          next.delete(externalCategoryId);
        } else {
          next.set(externalCategoryId, internalCategoryId);
        }
        return next;
      });
    },
    [mappings]
  );

  const handleAutoMatchByName = useCallback((): void => {
    if (!selectedCatalogId) {
      toast('Select a catalog before auto-matching categories.', { variant: 'info' });
      return;
    }

    const result = autoMatchCategoryMappingsByName({
      externalCategories,
      internalCategories,
      pendingMappings,
      getCurrentMapping: getMappingForExternal,
    });

    if (result.matchedCount > 0) {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        for (const match of result.matches) {
          next.set(match.externalCategoryId, match.internalCategoryId);
        }
        return next;
      });
    }

    toast(formatAutoMatchCategoryMappingsByNameMessage(result), {
      variant: result.matchedCount > 0 ? 'success' : 'info',
    });
  }, [
    externalCategories,
    getMappingForExternal,
    internalCategories,
    pendingMappings,
    selectedCatalogId,
    toast,
  ]);

  const handleSave = async (): Promise<void> => {
    if (pendingMappings.size === 0 || !selectedCatalogId) {
      toast('No changes to save', { variant: 'info' });
      return;
    }

    try {
      const mappingsToSave = Array.from(pendingMappings.entries()).map(
        ([externalCategoryId, internalCategoryId]: [string, string | null]) => ({
          externalCategoryId,
          internalCategoryId,
        })
      );

      const result = await saveMutation.mutateAsync({
        connectionId,
        catalogId: selectedCatalogId,
        mappings: mappingsToSave,
      });

      toast(result.message, { variant: 'success' });
      setPendingMappings(new Map());
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoryMapper',
        action: 'saveMappings',
        connectionId,
        catalogId: selectedCatalogId,
      });
      const message = error instanceof Error ? error.message : 'Failed to save mappings';
      toast(message, { variant: 'error' });
    }
  };

  const toggleExpand = useCallback((categoryId: string): void => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const categoryTree = useMemo(() => buildCategoryTree(externalCategories), [externalCategories]);

  const stats = useMemo((): { total: number; mapped: number; unmapped: number; pending: number; stale: number } => {
    const staleMappings = mappings.filter((mapping: CategoryMappingWithDetails): boolean => {
      if (!mapping.isActive) return false;
      const externalCategoryId = mapping.externalCategoryId.trim();
      if (!externalCategoryId) return false;
      return (
        !externalIds.has(externalCategoryId) ||
        isMissingExternalCategoryName(mapping.externalCategory?.name)
      );
    });
    const total = externalCategories.length;
    const mapped = externalCategories.filter(
      (c: ExternalCategory) => getMappingForExternal(c.externalId) !== null
    ).length;
    const unmapped = Math.max(0, total - mapped);
    const pending = pendingMappings.size;
    return { total, mapped, unmapped, pending, stale: staleMappings.length };
  }, [externalCategories, externalIds, getMappingForExternal, mappings, pendingMappings.size]);

  const staleMappings = useMemo(
    (): Array<{
      externalCategoryId: string;
      externalCategoryName: string;
      externalCategoryPath: string | null;
      internalCategoryLabel: string | null;
    }> =>
      mappings
        .filter((mapping: CategoryMappingWithDetails): boolean => {
          if (!mapping.isActive) return false;
          const externalCategoryId = mapping.externalCategoryId.trim();
          if (!externalCategoryId) return false;
          return (
            !externalIds.has(externalCategoryId) ||
            isMissingExternalCategoryName(mapping.externalCategory?.name)
          );
        })
        .map((mapping: CategoryMappingWithDetails) => ({
          externalCategoryId: mapping.externalCategoryId,
          externalCategoryName:
            mapping.externalCategory?.name?.trim() || mapping.externalCategoryId,
          externalCategoryPath:
            mapping.externalCategory?.path?.trim() || null,
          internalCategoryLabel:
            mapping.internalCategory?.name?.trim() || mapping.internalCategoryId || null,
        })),
    [externalIds, mappings]
  );

  const configValue = useMemo<CategoryMapperConfig>(
    () => ({
      connectionId,
      connectionName,
      integrationId,
      integrationSlug,
    }),
    [connectionId, connectionName, integrationId, integrationSlug]
  );

  const dataValue = useMemo<CategoryMapperData>(
    () => ({
      catalogs,
      catalogsLoading,
      selectedCatalogId,
      setSelectedCatalogId,
      internalCategories,
      internalCategoriesLoading,
      internalCategoryOptions,
      externalCategories,
      externalCategoriesLoading,
      externalIds,
      mappings,
      mappingsLoading,
      categoryTree,
    }),
    [
      catalogs,
      catalogsLoading,
      selectedCatalogId,
      internalCategories,
      internalCategoriesLoading,
      internalCategoryOptions,
      externalCategories,
      externalCategoriesLoading,
      externalIds,
      mappings,
      mappingsLoading,
      categoryTree,
    ]
  );

  const uiStateValue = useMemo<CategoryMapperUIState>(
    () => ({
      pendingMappings,
      expandedIds,
      toggleExpand,
      showTraderaLoginRecoveryModal,
      traderaLoginRecoveryReason,
      openingTraderaLoginRecovery,
      staleMappings,
      stats,
    }),
    [
      pendingMappings,
      expandedIds,
      toggleExpand,
      showTraderaLoginRecoveryModal,
      traderaLoginRecoveryReason,
      openingTraderaLoginRecovery,
      staleMappings,
      stats,
    ]
  );

  const actionsValue = useMemo<CategoryMapperActions>(
    () => ({
      handleFetchExternalCategories,
      handleOpenTraderaLoginRecovery,
      closeTraderaLoginRecoveryModal,
      handleAutoMatchByName,
      handleMappingChange,
      handleSave,
      getMappingForExternal,
      fetchMutation,
      saveMutation,
    }),
    [
      handleFetchExternalCategories,
      handleOpenTraderaLoginRecovery,
      closeTraderaLoginRecoveryModal,
      handleAutoMatchByName,
      handleMappingChange,
      handleSave,
      getMappingForExternal,
      fetchMutation,
      saveMutation,
    ]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <DataContext.Provider value={dataValue}>
        <UIStateContext.Provider value={uiStateValue}>
          <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
        </UIStateContext.Provider>
      </DataContext.Provider>
    </ConfigContext.Provider>
  );
}
