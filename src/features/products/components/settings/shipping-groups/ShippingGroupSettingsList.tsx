'use client';

import React from 'react';

import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { Button } from '@/shared/ui/button';
import { SimpleSettingsList } from '@/shared/ui/templates/SimpleSettingsList';

import {
  buildShippingGroupListItem,
  resolveRepairActionState,
  type ShippingGroupsListState,
} from './ShippingGroupList.helpers';

function ShippingGroupRepairAction({
  shippingGroup,
  state,
}: {
  shippingGroup: ProductShippingGroup;
  state: ShippingGroupsListState;
}): React.JSX.Element | null {
  const repairActionState = resolveRepairActionState(shippingGroup, state);
  if (!repairActionState.hasRuleRepair) return null;

  return (
    <Button
      type='button'
      onClick={() => {
        void state.handleRepairRule(shippingGroup);
      }}
      disabled={state.saveShippingGroupMutation.isPending || repairActionState.isRepairBlocked}
      className='h-8 px-3'
      title={repairActionState.buttonTitle}
    >
      {repairActionState.buttonLabel}
    </Button>
  );
}

export function ShippingGroupSettingsList({
  state,
}: {
  state: ShippingGroupsListState;
}): React.JSX.Element {
  return (
    <SimpleSettingsList
      items={state.shippingGroups.map((shippingGroup) =>
        buildShippingGroupListItem(shippingGroup, state)
      )}
      isLoading={state.loading || state.loadingSelectedCatalogCategories}
      renderActions={(item) => (
        <ShippingGroupRepairAction shippingGroup={item.original} state={state} />
      )}
      onEdit={(item) => state.openEditModal(item.original)}
      onDelete={(item) => state.handleDelete(item.original)}
      emptyMessage='No shipping groups yet. Create shipping groups and assign them to products before mapping delivery behavior.'
    />
  );
}
