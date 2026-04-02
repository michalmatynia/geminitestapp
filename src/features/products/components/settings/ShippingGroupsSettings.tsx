'use client';

import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  useDeleteShippingGroupMutation,
  useSaveShippingGroupMutation,
} from '@/features/products/hooks/useProductSettingsQueries';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog, ProductShippingGroup } from '@/shared/contracts/products';
import {
  Button,
  EmptyState,
  FormField,
  FormModal,
  FormSection,
  Input,
  SelectSimple,
  SimpleSettingsList,
  Textarea,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useProductSettingsShippingGroupsContext } from './ProductSettingsContext';

type ShippingGroupFormData = {
  name: string;
  description: string;
  catalogId: string;
  traderaShippingCondition: string;
};

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
  });

  const saveShippingGroupMutation = useSaveShippingGroupMutation();
  const deleteShippingGroupMutation = useDeleteShippingGroupMutation();

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
    });
    setShowModal(true);
  };

  const openEditModal = (shippingGroup: ProductShippingGroup): void => {
    setEditingShippingGroup(shippingGroup);
    setFormData({
      name: shippingGroup.name,
      description: shippingGroup.description ?? '',
      catalogId: shippingGroup.catalogId,
      traderaShippingCondition: shippingGroup.traderaShippingCondition ?? '',
    });
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

    try {
      await saveShippingGroupMutation.mutateAsync({
        id: editingShippingGroup?.id,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          catalogId: formData.catalogId,
          traderaShippingCondition: formData.traderaShippingCondition.trim() || null,
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
      const message = error instanceof Error ? error.message : 'Failed to save shipping group.';
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
            <div className='mt-4'>
              <SimpleSettingsList
                items={shippingGroups.map((shippingGroup: ProductShippingGroup) => ({
                  id: shippingGroup.id,
                  title: shippingGroup.name,
                  description: shippingGroup.description ?? undefined,
                  subtitle: shippingGroup.traderaShippingCondition
                    ? `Tradera: ${shippingGroup.traderaShippingCondition}`
                    : undefined,
                  original: shippingGroup,
                }))}
                isLoading={loading}
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
          </div>
        </FormModal>
      )}
    </div>
  );
}
