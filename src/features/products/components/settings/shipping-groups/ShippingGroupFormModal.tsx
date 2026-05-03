'use client';

import React from 'react';

import { FormModal } from '@/shared/ui/FormModal';

import { useShippingGroupsState } from './ShippingGroupsContext';
import { ShippingGroupFormModalAssignmentFields } from './ShippingGroupFormModalAssignmentFields';
import { ShippingGroupFormModalBasicFields } from './ShippingGroupFormModalBasicFields';
import { ShippingGroupFormModalRuleAlerts } from './ShippingGroupFormModalRuleAlerts';
import { ShippingGroupFormModalTraderaFields } from './ShippingGroupFormModalTraderaFields';

export function ShippingGroupFormModal(): React.JSX.Element | null {
  const {
    showModal,
    setShowModal,
    editingShippingGroup,
    handleSave,
    saveShippingGroupMutation,
  } = useShippingGroupsState();

  if (showModal === false) return null;

  return (
    <FormModal
      open={showModal}
      onClose={(): void => setShowModal(false)}
      title={editingShippingGroup !== null ? 'Edit Shipping Group' : 'Create Shipping Group'}
      onSave={(): void => {
        void handleSave();
      }}
      isSaving={saveShippingGroupMutation.isPending}
      size='md'
    >
      <div className='space-y-4'>
        <ShippingGroupFormModalBasicFields />
        <ShippingGroupFormModalAssignmentFields />
        <ShippingGroupFormModalRuleAlerts />
        <ShippingGroupFormModalTraderaFields />
      </div>
    </FormModal>
  );
}
