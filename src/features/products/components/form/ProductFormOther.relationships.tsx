'use client';

import React, { useMemo } from 'react';

import { buildProducerNameById, formatProducerDisplayValue } from '@/features/products/lib/resolveValidatorProducerReplacement';
import { resolveValidatorFieldReplacement } from '@/features/products/lib/resolveValidatorFieldReplacement';
import type { FieldValidatorIssue } from '@/features/products/validation-engine/core';
import type { ProductCategory } from '@/shared/contracts/products/categories';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';

import { CatalogMultiSelectField } from './CatalogMultiSelectField';
import { CategorySingleSelectField } from './CategorySingleSelectField';
import { CategoryIssueHintRow, ProducerIssueHintRow } from './ProductFormOther.issue-hints';
import type { ProductFormOtherRelationshipsSectionProps } from './ProductFormOther.relationships.types';
import {
  ShippingGroupAlerts,
  ShippingGroupField,
  useShippingGroupModel,
} from './ProductFormOther.shipping';
import { ProducerMultiSelectField } from './ProducerMultiSelectField';
import { TagMultiSelectField } from './TagMultiSelectField';

const getIssueList = (
  fieldName: string,
  validatorEnabled: boolean,
  visibleFieldIssues: Record<string, FieldValidatorIssue[] | undefined>
): FieldValidatorIssue[] => {
  if (validatorEnabled === false) return [];
  const issueList = visibleFieldIssues[fieldName];
  return Array.isArray(issueList) ? issueList : [];
};

const buildCategoryNameById = (categories: ProductCategory[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const category of categories) {
    const id = category.id.trim();
    if (id === '') continue;
    const name = category.name.trim();
    map.set(id, name !== '' ? name : id);
  }
  return map;
};

const resolveSelectedCategoryName = (
  categories: ProductCategory[],
  selectedCategoryId: string | null
): string => {
  if (selectedCategoryId === null || selectedCategoryId === '') return '';
  const category = categories.find((item) => item.id === selectedCategoryId);
  return category !== undefined ? category.name.trim() : '';
};

const resolveCurrentCategoryLabel = (
  selectedCategoryName: string,
  selectedCategoryId: string | null,
  categoryNameById: Map<string, string>
): string => {
  if (selectedCategoryName !== '') return selectedCategoryName;
  if (selectedCategoryId !== null && selectedCategoryId !== '') {
    return categoryNameById.get(selectedCategoryId) ?? selectedCategoryId;
  }
  return '(none)';
};

const CategoryRelationshipFields = ({
  props,
  categoryIssueList,
  categoryNameById,
  selectedCategoryName,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  categoryIssueList: FieldValidatorIssue[];
  categoryNameById: Map<string, string>;
  selectedCategoryName: string;
}): React.JSX.Element => (
  <>
    <CategorySingleSelectField
      placeholder='Select category'
    />
    {categoryIssueList.map((issue) => {
      const replacementId = issue.replacementValue?.trim() ?? '';
      const resolvedReplacement = resolveValidatorFieldReplacement({
        fieldName: 'categoryId',
        replacementValue: replacementId,
        categories: props.categories,
        categoryNameById,
      });
      return (
        <CategoryIssueHintRow
          key={issue.patternId}
          issue={issue}
          currentCategoryLabel={resolveCurrentCategoryLabel(
            selectedCategoryName,
            props.selectedCategoryId,
            categoryNameById
          )}
          proposedCategoryLabel={resolvedReplacement?.displayValue ?? null}
          selectedCategoryId={props.selectedCategoryId}
          canApplyReplacement={resolvedReplacement !== null}
        />
      );
    })}
    {props.selectedCategoryId !== null && props.selectedCategoryId !== '' ? (
      <div className='-mt-2 flex justify-end'>
        <Button
          type='button'
          variant='ghost'
          className='h-7 px-2 text-xs text-gray-300 hover:text-white'
          onClick={(): void => props.setCategoryId(null)}
        >
          Clear category
        </Button>
      </div>
    ) : null}
  </>
);

const ProducerRelationshipFields = ({
  props,
  producerIssueList,
  selectedProducerLabel,
  producerNameById,
}: {
  props: ProductFormOtherRelationshipsSectionProps;
  producerIssueList: FieldValidatorIssue[];
  selectedProducerLabel: string;
  producerNameById: Map<string, string>;
}): React.JSX.Element => (
  <>
    <ProducerMultiSelectField />
    {producerIssueList.map((issue) => {
      const resolvedReplacement = resolveValidatorFieldReplacement({
        fieldName: 'producerIds',
        replacementValue: issue.replacementValue,
        producers: props.producers,
        producerNameById,
      });
      return (
        <ProducerIssueHintRow
          key={issue.patternId}
          issue={issue}
          currentProducerLabel={selectedProducerLabel !== '' ? selectedProducerLabel : '(none)'}
          proposedProducerLabel={resolvedReplacement?.displayValue ?? null}
          selectedProducerIds={props.selectedProducerIds}
          canApplyReplacement={resolvedReplacement !== null}
        />
      );
    })}
  </>
);

export function ProductFormOtherRelationshipsSection(
  props: ProductFormOtherRelationshipsSectionProps
): React.JSX.Element {
  const categoryIssueList = getIssueList('categoryId', props.validatorEnabled, props.visibleFieldIssues);
  const producerIssueList = getIssueList('producerIds', props.validatorEnabled, props.visibleFieldIssues);
  const categoryNameById = useMemo(() => buildCategoryNameById(props.categories), [props.categories]);
  const producerNameById = useMemo(() => buildProducerNameById(props.producers), [props.producers]);
  const selectedCategoryName = useMemo(
    () => resolveSelectedCategoryName(props.categories, props.selectedCategoryId),
    [props.categories, props.selectedCategoryId]
  );
  const selectedProducerLabel = useMemo(
    () =>
      formatProducerDisplayValue({
        producerIds: props.selectedProducerIds,
        producers: props.producers,
        producerNameById,
      }),
    [producerNameById, props.producers, props.selectedProducerIds]
  );
  const shippingModel = useShippingGroupModel(props);
  return (
    <FormSection title='Relationships' gridClassName='md:grid-cols-2'>
      <div className='space-y-4 md:col-span-2'>
        <CatalogMultiSelectField emptyMessage={props.catalogsError ?? 'No catalogs found'} />
        <CategoryRelationshipFields
          props={props}
          categoryIssueList={categoryIssueList}
          categoryNameById={categoryNameById}
          selectedCategoryName={selectedCategoryName}
        />
        <ShippingGroupField props={props} model={shippingModel} />
        <ShippingGroupAlerts props={props} model={shippingModel} />
        <TagMultiSelectField
          disabled={props.hasCatalogs === false}
          placeholder={props.hasCatalogs ? 'Select tags' : 'Select a catalog first'}
        />
        <ProducerRelationshipFields
          props={props}
          producerIssueList={producerIssueList}
          selectedProducerLabel={selectedProducerLabel}
          producerNameById={producerNameById}
        />
      </div>
    </FormSection>
  );
}
