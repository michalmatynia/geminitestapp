'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  useCategories as useProductMetadataCategories,
  useShippingGroups as useProductMetadataShippingGroups,
} from '@/features/products/hooks/useProductMetadataQueries';
import {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type {
  ProductShippingGroup,
  ShippingGroupFormData,
} from '@/shared/contracts/products/shipping-groups';
import {
  buildCategoryPathLabelMap,
  buildShippingGroupRuleConflicts,
  findRedundantShippingGroupRuleCategoryIds,
  formatCategoryRuleSummary,
  normalizeShippingGroupRuleCategoryIds,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';
import { Textarea } from '@/shared/ui/textarea';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useProductSettingsShippingGroupsContext } from './ProductSettingsContext';
import {
  DRAFT_SHIPPING_GROUP_ID,
  readConflictMetaFromApiError,
  formatShippingGroupConflictMessage,
  summarizeRuleDescendantCoverage,
} from '../../utils/shipping-group-settings-utils';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export function ShippingGroupsSettings(): React.JSX.Element {
  const {
    loadingShippingGroups: loading,
    shippingGroups,
    catalogs,
    selectedShippingGroupCatalogId: selectedCatalogId,
    onShippingGroupCatalogChange: onCatalogChange,
    onRefreshShippingGroups: onRefresh,
  } = useProductSettingsShippingGroupsContext();

  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingShippingGroup, setEditingShippingGroup] = useState<ProductShippingGroup | null>(null);
  const [shippingGroupToDelete, setShippingGroupToDelete] =
    useState<ProductShippingGroup | null>(null);
  const [formData, setFormData] = useState<ShippingGroupFormData>({
    name: '',
    description: '',
    catalogId: '',
    traderaShippingCondition: '',
    traderaShippingPriceEur: '',
    autoAssignCategoryIds: [],
    autoAssignCurrencyCodes: [],
  });

  const {
    data: selectedCatalogCategories = [],
    isLoading: loadingSelectedCatalogCategories,
  } = useProductMetadataCategories(selectedCatalogId ?? undefined, {
    enabled: Boolean(selectedCatalogId),
  });
  const {
    data: modalCatalogCategories = [],
    isLoading: loadingModalCatalogCategories,
  } = useProductMetadataCategories(formData.catalogId || undefined, {
    enabled: Boolean(formData.catalogId),
  });
  const {
    data: modalCatalogShippingGroups = [],
    isLoading: loadingModalCatalogShippingGroups,
  } = useProductMetadataShippingGroups(formData.catalogId || undefined, {
    enabled: Boolean(formData.catalogId) && showModal,
  });

  const saveShippingGroupMutation = useSaveShippingGroupMutation();
  const deleteShippingGroupMutation = useDeleteShippingGroupMutation();
  const normalizedModalRuleIds = useMemo(
    () =>
      normalizeShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );
  const redundantModalRuleIds = useMemo(
    () =>
      findRedundantShippingGroupRuleCategoryIds({
        categoryIds: formData.autoAssignCategoryIds,
        categories: modalCatalogCategories,
      }),
    [formData.autoAssignCategoryIds, modalCatalogCategories]
  );

  const openCreateModal = (): void => {
    if (!selectedCatalogId) {
      toast('Please select a catalog first.', { variant: 'error' });
      return;
    }
    setEditingShippingGroup(null);
    setFormData({
      name: '',
      description: '',
      catalogId: selectedCatalogId,
      traderaShippingCondition: '',
      traderaShippingPriceEur: '',
      autoAssignCategoryIds: [],
      autoAssignCurrencyCodes: [],
    });
    setShowModal(true);
  };

  const openEditModal = (shippingGroup: ProductShippingGroup): void => {
    setEditingShippingGroup(shippingGroup);
    const nextFormData: ShippingGroupFormData = {
      name: shippingGroup.name,
      description: shippingGroup.description ?? '',
      catalogId: shippingGroup.catalogId,
      traderaShippingCondition: shippingGroup.traderaShippingCondition ?? '',
      traderaShippingPriceEur:
        typeof shippingGroup.traderaShippingPriceEur === 'number' &&
        Number.isFinite(shippingGroup.traderaShippingPriceEur)
          ? String(shippingGroup.traderaShippingPriceEur)
          : '',
      autoAssignCategoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
        ? shippingGroup.autoAssignCategoryIds
        : [],
      autoAssignCurrencyCodes: Array.isArray(shippingGroup.autoAssignCurrencyCodes)
        ? shippingGroup.autoAssignCurrencyCodes
        : [],
    };
    setFormData(nextFormData);
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast('Shipping group name is required.', { variant: 'error' });
      return;
    }
    if (!formData.catalogId) {
      toast('Catalog is required.', { variant: 'error' });
      return;
    }
    const trimmedShippingPrice = formData.traderaShippingPriceEur.trim();
    if (trimmedShippingPrice) {
      const parsedShippingPrice = Number(trimmedShippingPrice);
      if (!Number.isFinite(parsedShippingPrice) || parsedShippingPrice < 0) {
        toast('Tradera shipping price must be a non-negative EUR amount.', {
          variant: 'error',
        });
        return;
      }
    }
    if (modalShippingGroupRuleConflicts.length > 0) {
      toast(
        formatShippingGroupConflictMessage({
          conflicts: modalShippingGroupRuleConflicts,
          categoryLabelById: modalCategoryLabelById,
          draftShippingGroupId: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
        }),
        { variant: 'error' }
      );
      return;
    }

    try {
      await saveShippingGroupMutation.mutateAsync({
        id: editingShippingGroup?.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          catalogId: formData.catalogId,
          traderaShippingCondition: formData.traderaShippingCondition.trim() || null,
          traderaShippingPriceEur: trimmedShippingPrice ? Number(trimmedShippingPrice) : null,
          autoAssignCategoryIds: normalizedModalRuleIds,
          autoAssignCurrencyCodes: formData.autoAssignCurrencyCodes,
        },
      });

      toast(editingShippingGroup ? 'Shipping group updated.' : 'Shipping group created.', {
        variant: 'success',
      });
      setShowModal(false);
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'saveShippingGroup',
        shippingGroupId: editingShippingGroup?.id,
      });
      const conflictMeta = readConflictMetaFromApiError(error);
      const message =
        conflictMeta.length > 0
          ? formatShippingGroupConflictMessage({
              conflicts: conflictMeta,
              categoryLabelById: modalCategoryLabelById,
              draftShippingGroupId: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
            })
          : error instanceof Error
            ? error.message
            : 'Failed to save shipping group.';
      toast(message, { variant: 'error' });
    }
  };

  const handleDelete = useCallback((shippingGroup: ProductShippingGroup): void => {
    setShippingGroupToDelete(shippingGroup);
  }, []);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!shippingGroupToDelete) return;

    try {
      await deleteShippingGroupMutation.mutateAsync({
        id: shippingGroupToDelete.id,
        catalogId: selectedCatalogId,
      });
      toast('Shipping group deleted.', { variant: 'success' });
      onRefresh();
    } catch (error) {
      logClientCatch(error, {
        source: 'ShippingGroupsSettings',
        action: 'deleteShippingGroup',
        shippingGroupId: shippingGroupToDelete.id,
      });
      const message = error instanceof Error ? error.message : 'Failed to delete shipping group.';
      toast(message, { variant: 'error' });
    } finally {
      setShippingGroupToDelete(null);
    }
  };

  const selectedCatalog = catalogs.find((catalog: Catalog) => catalog.id === selectedCatalogId);
  const catalogOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      catalogs.map((catalog: Catalog) => ({
        value: catalog.id,
        label: `${catalog.name}${catalog.isDefault ? ' (Default)' : ''}`,
      })),
    [catalogs]
  );
  const selectedCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(selectedCatalogCategories),
    [selectedCatalogCategories]
  );
  const modalCategoryLabelById = useMemo(
    () => buildCategoryPathLabelMap(modalCatalogCategories),
    [modalCatalogCategories]
  );
  const redundantModalRuleSummary = useMemo(
    () =>
      formatCategoryRuleSummary({
        categoryIds: redundantModalRuleIds,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCategoryLabelById, redundantModalRuleIds]
  );
  const normalizedModalRuleSummary = useMemo(
    () =>
      formatCategoryRuleSummary({
        categoryIds: normalizedModalRuleIds,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCategoryLabelById, normalizedModalRuleIds]
  );
  const missingModalRuleSummary = useMemo(() => {
    const missingRuleIds = formData.autoAssignCategoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter((categoryId) => categoryId.length > 0 && !modalCategoryLabelById.has(categoryId));

    return missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null;
  }, [formData.autoAssignCategoryIds, modalCategoryLabelById]);
  const shouldShowNormalizedModalRuleSummary = useMemo(() => {
    const rawRuleIds = formData.autoAssignCategoryIds
      .map((categoryId) => toTrimmedString(categoryId))
      .filter(Boolean);

    if (rawRuleIds.length !== normalizedModalRuleIds.length) {
      return true;
    }

    return rawRuleIds.some((categoryId, index) => categoryId !== normalizedModalRuleIds[index]);
  }, [formData.autoAssignCategoryIds, normalizedModalRuleIds]);
  const shippingGroupRuleConflicts = useMemo(
    () =>
      buildShippingGroupRuleConflicts({
        shippingGroups,
        categories: selectedCatalogCategories,
      }),
    [selectedCatalogCategories, shippingGroups]
  );
  const modalCategoryOptions = useMemo<Array<LabeledOptionDto<string>>>(
    () =>
      modalCatalogCategories.map((category) => ({
        value: category.id,
        label: modalCategoryLabelById.get(category.id) ?? category.name,
      })),
    [modalCatalogCategories, modalCategoryLabelById]
  );
  const shippingGroupRuleCoverageById = useMemo(() => {
    const coverageById = new Map<
      string,
      {
        descendantIds: string[];
        descendantSummary: string | null;
      }
    >();

    for (const shippingGroup of shippingGroups) {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      coverageById.set(
        shippingGroup.id,
        summarizeRuleDescendantCoverage({
          categoryIds: normalizedRuleIds,
          categories: selectedCatalogCategories,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return coverageById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);
  const shippingGroupNormalizedRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const normalizedRuleIds = normalizeShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      summaryById.set(
        shippingGroup.id,
        formatCategoryRuleSummary({
          categoryIds: normalizedRuleIds,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return summaryById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);
  const shippingGroupRedundantRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const redundantRuleIds = findRedundantShippingGroupRuleCategoryIds({
        categoryIds: Array.isArray(shippingGroup.autoAssignCategoryIds)
          ? shippingGroup.autoAssignCategoryIds
          : [],
        categories: selectedCatalogCategories,
      });

      summaryById.set(
        shippingGroup.id,
        formatCategoryRuleSummary({
          categoryIds: redundantRuleIds,
          categoryLabelById: selectedCategoryLabelById,
        })
      );
    }

    return summaryById;
  }, [selectedCatalogCategories, selectedCategoryLabelById, shippingGroups]);
  const shippingGroupMissingRuleSummaryById = useMemo(() => {
    const summaryById = new Map<string, string | null>();

    for (const shippingGroup of shippingGroups) {
      const missingRuleIds = (Array.isArray(shippingGroup.autoAssignCategoryIds)
        ? shippingGroup.autoAssignCategoryIds
        : []
      )
        .map((categoryId) => toTrimmedString(categoryId))
        .filter((categoryId) => categoryId.length > 0 && !selectedCategoryLabelById.has(categoryId));

      summaryById.set(
        shippingGroup.id,
        missingRuleIds.length > 0 ? missingRuleIds.join(', ') : null
      );
    }

    return summaryById;
  }, [selectedCategoryLabelById, shippingGroups]);
  const shippingGroupsWithRedundantRules = useMemo(
    () =>
      shippingGroups.filter((shippingGroup) =>
        Boolean(shippingGroupRedundantRuleSummaryById.get(shippingGroup.id))
      ),
    [shippingGroupRedundantRuleSummaryById, shippingGroups]
  );
  const shippingGroupsWithMissingRuleCategories = useMemo(
    () =>
      shippingGroups.filter((shippingGroup) =>
        Boolean(shippingGroupMissingRuleSummaryById.get(shippingGroup.id))
      ),
    [shippingGroupMissingRuleSummaryById, shippingGroups]
  );
  const modalShippingGroupRuleConflicts = useMemo(() => {
    const draftRuleIds = normalizedModalRuleIds;
    if (!formData.catalogId || draftRuleIds.length === 0) {
      return [];
    }

    const draftShippingGroup: ProductShippingGroup = {
      id: editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID,
      name: formData.name.trim() || 'This shipping group',
      description: formData.description.trim() || null,
      catalogId: formData.catalogId,
      traderaShippingCondition: formData.traderaShippingCondition.trim() || null,
      traderaShippingPriceEur: formData.traderaShippingPriceEur.trim()
        ? Number(formData.traderaShippingPriceEur)
        : null,
      autoAssignCategoryIds: draftRuleIds,
      autoAssignCurrencyCodes: [],
    };
    const modalPeerShippingGroups = modalCatalogShippingGroups.filter(
      (shippingGroup) => shippingGroup.id !== draftShippingGroup.id
    );

    return buildShippingGroupRuleConflicts({
      shippingGroups: [draftShippingGroup, ...modalPeerShippingGroups],
      categories: modalCatalogCategories,
    }).filter((conflict) => conflict.groupIds.includes(draftShippingGroup.id));
  }, [
    editingShippingGroup?.id,
    formData.catalogId,
    formData.description,
    formData.name,
    formData.traderaShippingCondition,
    formData.traderaShippingPriceEur,
    modalCatalogCategories,
    modalCatalogShippingGroups,
    normalizedModalRuleIds,
  ]);
  const modalRuleCoverage = useMemo(
    () =>
      summarizeRuleDescendantCoverage({
        categoryIds: normalizedModalRuleIds,
        categories: modalCatalogCategories,
        categoryLabelById: modalCategoryLabelById,
      }),
    [modalCatalogCategories, modalCategoryLabelById, normalizedModalRuleIds]
  );

  return (
    <div className='space-y-5'>
      <FormSection
        title='Select Catalog'
        description='Shipping groups are managed per catalog.'
        className='p-4'
      >
        <div className='w-full max-w-xs mt-4'>
          <SelectSimple
            size='sm'
            value={selectedCatalogId || ''}
            onValueChange={onCatalogChange}
            options={catalogOptions}
            placeholder='Select a catalog...'
            ariaLabel='Catalog'
            title='Select a catalog...'
          />
        </div>
      </FormSection>

      {selectedCatalogId && (
        <>
          <div className='flex justify-start'>
            <Button onClick={openCreateModal} className='bg-white text-gray-900 hover:bg-gray-200'>
              <Plus className='size-4 mr-2' />
              Add Shipping Group
            </Button>
          </div>

          <FormSection
            title={`Shipping Groups for "${selectedCatalog?.name}"`}
            description='Assign these internal shipping groups to products, then map them into Tradera listing behavior.'
            className='p-4'
          >
            {shippingGroupRuleConflicts.length > 0 ? (
              <Alert variant='warning' className='mb-4'>
                <div className='space-y-1 text-sm'>
                  <p>
                    Conflicting auto-assign rules detected. Products in overlapping categories will
                    need a manual shipping-group override unless you adjust these rules.
                  </p>
                  {shippingGroupRuleConflicts.map((conflict) => {
                    const overlapLabel =
                      formatCategoryRuleSummary({
                        categoryIds: conflict.overlapCategoryIds,
                        categoryLabelById: selectedCategoryLabelById,
                      }) ?? `${conflict.overlapCategoryIds.length} categories`;

                    return (
                      <p key={conflict.groupIds.join(':')}>
                        <strong>{conflict.groupNames[0]}</strong> and{' '}
                        <strong>{conflict.groupNames[1]}</strong> both match{' '}
                        <strong>{overlapLabel}</strong>.
                      </p>
                    );
                  })}
                </div>
              </Alert>
            ) : null}

            {shippingGroupsWithRedundantRules.length > 0 ? (
              <Alert variant='warning' className='mb-4'>
                <div className='space-y-1 text-sm'>
                  <p>
                    Some auto-assign rules include descendant categories already covered by parent
                    categories. Edit and save these groups to simplify them.
                  </p>
                  {shippingGroupsWithRedundantRules.map((shippingGroup) => (
                    <p key={shippingGroup.id}>
                      <strong>{shippingGroup.name}</strong> redundantly includes{' '}
                      <strong>{shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)}</strong>.
                    </p>
                  ))}
                </div>
              </Alert>
            ) : null}

            {shippingGroupsWithMissingRuleCategories.length > 0 ? (
              <Alert variant='warning' className='mb-4'>
                <div className='space-y-1 text-sm'>
                  <p>
                    Some auto-assign rules reference categories that no longer exist in this
                    catalog. Edit and save these groups to repair or remove those rule entries.
                  </p>
                  {shippingGroupsWithMissingRuleCategories.map((shippingGroup) => (
                    <p key={shippingGroup.id}>
                      <strong>{shippingGroup.name}</strong> references missing categories:{' '}
                      <strong>{shippingGroupMissingRuleSummaryById.get(shippingGroup.id)}</strong>.
                    </p>
                  ))}
                </div>
              </Alert>
            ) : null}

            <div className='mt-4'>
              <SimpleSettingsList
                items={shippingGroups.map((shippingGroup: ProductShippingGroup) => ({
                  id: shippingGroup.id,
                  title: shippingGroup.name,
                  description: shippingGroup.description ?? undefined,
                  subtitle:
                    [
                      Array.isArray(shippingGroup.autoAssignCategoryIds) &&
                      shippingGroup.autoAssignCategoryIds.length > 0
                        ? `Categories (${shippingGroup.autoAssignCategoryIds.length}): ${
                            shippingGroupNormalizedRuleSummaryById.get(shippingGroup.id) ??
                            `${shippingGroup.autoAssignCategoryIds.length} categories`
                          }`
                        : null,
                      Array.isArray(shippingGroup.autoAssignCategoryIds) &&
                      shippingGroup.autoAssignCategoryIds.length > 0
                        ? `Auto: ${
                            shippingGroupNormalizedRuleSummaryById.get(shippingGroup.id) ??
                            `${shippingGroup.autoAssignCategoryIds.length} categories`
                          }${
                            (shippingGroupRuleCoverageById.get(shippingGroup.id)?.descendantIds
                              .length ?? 0) > 0
                              ? ' (+ descendants)'
                              : ''
                          }`
                        : null,
                      shippingGroup.traderaShippingCondition ||
                      typeof shippingGroup.traderaShippingPriceEur === 'number'
                        ? `Tradera: ${
                            shippingGroup.traderaShippingCondition || 'Shipping modal'
                          }${
                            typeof shippingGroup.traderaShippingPriceEur === 'number'
                              ? ` · EUR ${shippingGroup.traderaShippingPriceEur.toFixed(2)}`
                              : ''
                          }`
                        : null,
                      shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)
                        ? `Redundant: ${shippingGroupRedundantRuleSummaryById.get(shippingGroup.id)}`
                        : null,
                      shippingGroupMissingRuleSummaryById.get(shippingGroup.id)
                        ? `Missing: ${shippingGroupMissingRuleSummaryById.get(shippingGroup.id)}`
                        : null,
                    ]
                      .filter((value): value is string => Boolean(value))
                      .join(' · ') || undefined,
                  original: shippingGroup,
                }))}
                isLoading={loading || loadingSelectedCatalogCategories}
                onEdit={(item) => openEditModal(item.original)}
                onDelete={(item) => handleDelete(item.original)}
                emptyMessage='No shipping groups yet. Create shipping groups and assign them to products before mapping delivery behavior.'
              />
            </div>
          </FormSection>
        </>
      )}

      {!selectedCatalogId && catalogs.length === 0 && (
        <EmptyState
          title='No catalogs found'
          description='Please create a catalog first in the Catalogs section before adding shipping groups.'
        />
      )}

      <ConfirmModal
        isOpen={!!shippingGroupToDelete}
        onClose={() => setShippingGroupToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Shipping Group'
        message={`Are you sure you want to delete shipping group "${shippingGroupToDelete?.name}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {showModal && (
        <FormModal
          open={showModal}
          onClose={(): void => setShowModal(false)}
          title={editingShippingGroup ? 'Edit Shipping Group' : 'Create Shipping Group'}
          onSave={(): void => {
            void handleSave();
          }}
          isSaving={saveShippingGroupMutation.isPending}
          size='md'
        >
          <div className='space-y-4'>
            <FormField label='Name'>
              <Input
                className='h-9'
                value={formData.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: ShippingGroupFormData) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder='Shipping group name'
                aria-label='Shipping group name'
                title='Shipping group name'
              />
            </FormField>

            <FormField label='Catalog'>
              <SelectSimple
                size='sm'
                value={formData.catalogId}
                onValueChange={(value: string): void =>
                  setFormData((prev: ShippingGroupFormData) => ({
                    ...prev,
                    catalogId: value,
                    autoAssignCategoryIds: [],
                  }))
                }
                options={catalogOptions}
                placeholder='Select catalog'
                ariaLabel='Select catalog'
                title='Select catalog'
              />
            </FormField>

            <FormField
              label='Description'
              description='Optional internal note about when this shipping group should be used.'
            >
              <Textarea
                value={formData.description}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                  setFormData((prev: ShippingGroupFormData) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder='Internal shipping notes'
                aria-label='Shipping group description'
                title='Shipping group description'
              />
            </FormField>

            <FormField
              label='Auto-assign from Categories'
              description='Optional rule: products in these categories or their descendants use this shipping group automatically unless the product has a manual shipping group.'
            >
              <div className='space-y-3'>
                <MultiSelect
                  options={modalCategoryOptions}
                  selected={formData.autoAssignCategoryIds}
                  onChange={(values: string[]): void =>
                    setFormData((prev: ShippingGroupFormData) => ({
                      ...prev,
                      autoAssignCategoryIds: normalizeShippingGroupRuleCategoryIds({
                        categoryIds: values,
                        categories: modalCatalogCategories,
                      }),
                    }))
                  }
                  placeholder='Select categories for automatic assignment'
                  searchPlaceholder='Search categories...'
                  disabled={!formData.catalogId}
                  loading={loadingModalCatalogCategories}
                  emptyMessage='No categories available for this catalog.'
                />

                {formData.catalogId && !loadingModalCatalogCategories ? (
                  <p className='text-xs text-muted-foreground'>
                    {modalCategoryOptions.length === 0
                      ? 'No categories are available in this catalog yet.'
                      : modalCategoryOptions.length === 1
                        ? '1 category is available in this catalog. You can still attach multiple categories once more categories exist.'
                        : `${modalCategoryOptions.length} categories are available in this catalog. You can attach more than one category to the same shipping group.`}
                  </p>
                ) : null}

                {formData.autoAssignCategoryIds.length > 0 ? (
                  <div className='space-y-2'>
                    <p className='text-xs font-medium text-foreground'>
                      Selected categories ({formData.autoAssignCategoryIds.length})
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {formData.autoAssignCategoryIds
                        .map(
                          (categoryId) =>
                            modalCategoryLabelById.get(categoryId) ?? categoryId
                        )
                        .join(', ')}
                    </p>
                  </div>
                ) : null}
              </div>
            </FormField>

            {modalRuleCoverage.descendantSummary ? (
              <Alert variant='info' className='-mt-2'>
                <div className='text-sm'>
                  This rule also matches descendant categories:{' '}
                  <strong>{modalRuleCoverage.descendantSummary}</strong>.
                </div>
              </Alert>
            ) : null}

            {redundantModalRuleSummary ? (
              <Alert variant='info' className='-mt-2'>
                <div className='text-sm'>
                  Redundant descendant categories will be omitted on save:{' '}
                  <strong>{redundantModalRuleSummary}</strong>.
                </div>
              </Alert>
            ) : null}

            {missingModalRuleSummary ? (
              <Alert variant='warning' className='-mt-2'>
                <div className='text-sm'>
                  Missing categories will be removed on save:{' '}
                  <strong>{missingModalRuleSummary}</strong>.
                </div>
              </Alert>
            ) : null}

            {shouldShowNormalizedModalRuleSummary ? (
              <Alert variant='info' className='-mt-2'>
                <div className='text-sm'>
                  Effective auto-assign rule after save:{' '}
                  <strong>{normalizedModalRuleSummary ?? 'None'}</strong>.
                </div>
              </Alert>
            ) : null}

            {!loadingModalCatalogShippingGroups && modalShippingGroupRuleConflicts.length > 0 ? (
              <Alert variant='warning' className='-mt-2'>
                <div className='space-y-1 text-sm'>
                  <p>
                    This auto-assign rule overlaps with other shipping groups in this catalog.
                    Products in the overlapping categories will need a manual shipping-group
                    override unless you adjust these rules.
                  </p>
                  {modalShippingGroupRuleConflicts.map((conflict) => {
                    const overlapLabel =
                      formatCategoryRuleSummary({
                        categoryIds: conflict.overlapCategoryIds,
                        categoryLabelById: modalCategoryLabelById,
                      }) ?? `${conflict.overlapCategoryIds.length} categories`;
                    const otherGroupName =
                      conflict.groupIds[0] === (editingShippingGroup?.id ?? DRAFT_SHIPPING_GROUP_ID)
                        ? conflict.groupNames[1]
                        : conflict.groupNames[0];

                    return (
                      <p key={conflict.groupIds.join(':')}>
                        Overlaps with <strong>{otherGroupName}</strong> on{' '}
                        <strong>{overlapLabel}</strong>.
                      </p>
                    );
                  })}
                </div>
              </Alert>
            ) : null}

            <FormField
              label='Tradera Shipping Condition'
              description='Optional Tradera-facing shipping/delivery label to use later in listing flows.'
            >
              <Input
                className='h-9'
                value={formData.traderaShippingCondition}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: ShippingGroupFormData) => ({
                    ...prev,
                    traderaShippingCondition: event.target.value,
                  }))
                }
                placeholder='Buyer pays shipping'
                aria-label='Tradera shipping condition'
                title='Tradera shipping condition'
              />
            </FormField>

            <FormField
              label='Tradera Shipping Price (EUR)'
              description='Optional EUR amount to use when Tradera opens the shipping options modal during browser listings.'
            >
              <Input
                className='h-9'
                type='number'
                min='0'
                step='0.01'
                value={formData.traderaShippingPriceEur}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: ShippingGroupFormData) => ({
                    ...prev,
                    traderaShippingPriceEur: event.target.value,
                  }))
                }
                placeholder='5.00'
                aria-label='Tradera shipping price in EUR'
                title='Tradera shipping price in EUR'
              />
            </FormField>
          </div>
        </FormModal>
      )}
    </div>
  );
}
