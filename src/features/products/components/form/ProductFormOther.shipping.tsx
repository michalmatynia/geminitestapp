'use client';

import React, { useMemo } from 'react';

import type { ProductShippingGroup } from '@/shared/contracts/products/shipping-groups';
import { resolveEffectiveShippingGroup } from '@/shared/lib/products/utils/effective-shipping-group';
import {
  buildCategoryPathLabelMap,
  formatCategoryRuleSummary,
} from '@/shared/lib/products/utils/shipping-group-rule-conflicts';
import { Alert } from '@/shared/ui/alert';
import { FormField } from '@/shared/ui/form-section';
import { SelectSimple } from '@/shared/ui/select-simple';

import type { ProductFormOtherRelationshipsSectionProps } from './ProductFormOther.relationships.types';

export type ProductShippingGroupModel = {
  categoryPathLabelById: Map<string, string>;
  selectedShippingGroup: ProductShippingGroup | null;
  effectiveResolution: ReturnType<typeof resolveEffectiveShippingGroup>;
  automaticResolution: ReturnType<typeof resolveEffectiveShippingGroup>;
};

export const useShippingGroupModel = (
  props: ProductFormOtherRelationshipsSectionProps
): ProductShippingGroupModel => {
  const categoryPathLabelById = useMemo(
    () => buildCategoryPathLabelMap(props.categories),
    [props.categories]
  );
  const selectedShippingGroup = useMemo(
    () =>
      props.shippingGroups.find((shippingGroup) => shippingGroup.id === props.selectedShippingGroupId) ??
      null,
    [props.selectedShippingGroupId, props.shippingGroups]
  );
  const selectedCatalogId = props.selectedCatalogIds[0] ?? null;
  const effectiveResolution = useMemo(
    () =>
      resolveEffectiveShippingGroup({
        product: {
          shippingGroupId: props.selectedShippingGroupId !== '' ? props.selectedShippingGroupId : null,
          categoryId: props.selectedCategoryId,
          catalogId: selectedCatalogId,
        },
        shippingGroups: props.shippingGroups,
        categories: props.categories,
        manualShippingGroup: selectedShippingGroup,
      }),
    [props, selectedCatalogId, selectedShippingGroup]
  );
  const automaticResolution = useMemo(
    () =>
      resolveEffectiveShippingGroup({
        product: {
          shippingGroupId: null,
          categoryId: props.selectedCategoryId,
          catalogId: selectedCatalogId,
        },
        shippingGroups: props.shippingGroups,
        categories: props.categories,
        manualShippingGroup: null,
      }),
    [props, selectedCatalogId]
  );
  return {
    categoryPathLabelById,
    selectedShippingGroup,
    effectiveResolution,
    automaticResolution,
  };
};

const formatShippingRuleSummary = (
  model: ProductShippingGroupModel,
  categoryIds: string[]
): string =>
  formatCategoryRuleSummary({
    categoryIds,
    categoryLabelById: model.categoryPathLabelById,
  });

export const ShippingGroupAlerts = ({
  props,
  model,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
}): React.JSX.Element => {
  const automaticCategoryRuleShippingGroup =
    model.automaticResolution.source === 'category_rule'
      ? model.automaticResolution.shippingGroup
      : null;
  const autoAssignedShippingGroup =
    props.selectedShippingGroupId === '' && model.effectiveResolution.source === 'category_rule'
      ? model.effectiveResolution.shippingGroup
      : null;
  return (
    <>
      <ManualShippingMissingAlert props={props} model={model} />
      <AutoAssignedShippingAlert
        shippingGroup={autoAssignedShippingGroup}
        summary={formatShippingRuleSummary(model, model.effectiveResolution.matchedCategoryRuleIds)}
      />
      <MultipleShippingRulesAlert props={props} model={model} />
      <ManualShippingOverrideAlert
        props={props}
        model={model}
        automaticShippingGroup={automaticCategoryRuleShippingGroup}
        summary={formatShippingRuleSummary(model, model.automaticResolution.matchedCategoryRuleIds)}
      />
      <ManualShippingConflictResolutionAlert props={props} model={model} />
    </>
  );
};

const ManualShippingMissingAlert = ({
  props,
  model,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
}): React.JSX.Element | null => {
  if (props.selectedShippingGroupId === '') return null;
  if (model.effectiveResolution.reason !== 'manual_missing') return null;
  return (
    <Alert variant='warning' className='-mt-2'>
      <p className='text-sm'>
        The manually assigned shipping group no longer exists. Clear it or select a valid shipping group.
      </p>
    </Alert>
  );
};

const AutoAssignedShippingAlert = ({
  shippingGroup,
  summary,
}: {
  shippingGroup: ProductShippingGroup | null;
  summary: string;
}): React.JSX.Element | null => {
  if (shippingGroup === null) return null;
  return (
    <Alert variant='info' className='-mt-2'>
      <p className='text-sm'>
        Products in this category currently resolve to <strong>{shippingGroup.name}</strong> automatically
        {summary !== '' ? (
          <>
            {' '}via <strong>{summary}</strong>
          </>
        ) : null}
        .
      </p>
    </Alert>
  );
};

const MultipleShippingRulesAlert = ({
  props,
  model,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
}): React.JSX.Element | null => {
  if (props.selectedShippingGroupId !== '') return null;
  if (model.effectiveResolution.reason !== 'multiple_category_rules') return null;
  const matchingGroups = props.shippingGroups.filter((shippingGroup) =>
    model.effectiveResolution.matchingShippingGroupIds.includes(shippingGroup.id)
  );
  if (matchingGroups.length === 0) return null;
  return (
    <Alert variant='warning' className='-mt-2'>
      <p className='text-sm'>
        Multiple shipping-group category rules match this product:{' '}
        <strong>{matchingGroups.map((shippingGroup) => shippingGroup.name).join(', ')}</strong>.
        Select a manual shipping group to break the tie.
      </p>
    </Alert>
  );
};

const ManualShippingOverrideAlert = ({
  props,
  model,
  automaticShippingGroup,
  summary,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
  automaticShippingGroup: ProductShippingGroup | null;
  summary: string;
}): React.JSX.Element | null => {
  if (props.selectedShippingGroupId === '' || model.selectedShippingGroup === null) return null;
  if (automaticShippingGroup === null) return null;
  if (automaticShippingGroup.id === model.selectedShippingGroup.id) return null;
  return (
    <Alert variant='info' className='-mt-2'>
      <p className='text-sm'>
        Manual shipping group <strong>{model.selectedShippingGroup.name}</strong> overrides the
        category-based default <strong>{automaticShippingGroup.name}</strong>
        {summary !== '' ? (
          <>
            {' '}from <strong>{summary}</strong>
          </>
        ) : null}
        .
      </p>
    </Alert>
  );
};

const ManualShippingConflictResolutionAlert = ({
  props,
  model,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
}): React.JSX.Element | null => {
  if (props.selectedShippingGroupId === '' || model.selectedShippingGroup === null) return null;
  if (model.automaticResolution.reason !== 'multiple_category_rules') return null;
  const matchingGroups = props.shippingGroups.filter((shippingGroup) =>
    model.automaticResolution.matchingShippingGroupIds.includes(shippingGroup.id)
  );
  if (matchingGroups.length === 0) return null;
  return (
    <Alert variant='info' className='-mt-2'>
      <p className='text-sm'>
        Manual shipping group <strong>{model.selectedShippingGroup.name}</strong> resolves multiple
        matching category rules:{' '}
        <strong>{matchingGroups.map((shippingGroup) => shippingGroup.name).join(', ')}</strong>.
      </p>
    </Alert>
  );
};

export const ShippingGroupField = ({
  props,
  model,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  model: ProductShippingGroupModel;
}): React.JSX.Element => {
  const shippingGroupOptions = useMemo(
    () => [
      { value: '', label: 'No shipping group' },
      ...props.shippingGroups.map((shippingGroup) => ({
        value: shippingGroup.id,
        label: shippingGroup.name,
      })),
    ],
    [props.shippingGroups]
  );
  const autoAssignedShippingGroup =
    props.selectedShippingGroupId === '' && model.effectiveResolution.source === 'category_rule'
      ? model.effectiveResolution.shippingGroup
      : null;
  const summary = formatShippingRuleSummary(model, model.effectiveResolution.matchedCategoryRuleIds);
  const autoDescription =
    autoAssignedShippingGroup !== null
      ? `Auto-assigned from category rule: ${autoAssignedShippingGroup.name}${
          summary !== '' ? ` via ${summary}` : ''
        }. Select a shipping group manually to override it.`
      : 'Assign an internal shipping group to control marketplace delivery behavior later.';
  return (
    <FormField label='Shipping Group' description={autoDescription}>
      <SelectSimple
        size='sm'
        value={props.selectedShippingGroupId}
        onValueChange={(value: string): void =>
          props.setValue('shippingGroupId', value, { shouldDirty: true, shouldTouch: true })
        }
        options={shippingGroupOptions}
        placeholder={props.hasCatalogs ? 'Select shipping group' : 'Select a catalog first'}
        disabled={props.hasCatalogs === false || props.shippingGroupsLoading}
        ariaLabel='Shipping group'
        title='Shipping group'
      />
    </FormField>
  );
};
