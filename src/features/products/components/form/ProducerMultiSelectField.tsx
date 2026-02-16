'use client';

import React from 'react';

import type { Producer } from '@/features/products/types';

import { ProductMetadataMultiSelectField } from './ProductMetadataMultiSelectField';

type ProducerMultiSelectFieldProps = {
  producers?: Producer[] | undefined;
  selectedProducerIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
};

export function ProducerMultiSelectField(props: ProducerMultiSelectFieldProps): React.JSX.Element {
  return (
    <ProductMetadataMultiSelectField
      {...props}
      label='Producers'
      items={props.producers}
      selectedIds={props.selectedProducerIds}
      contextItemsKey='producers'
      contextSelectedKey='selectedProducerIds'
      contextLoadingKey='producersLoading'
      contextOnChangeKey='onProducersChange'
      formContextToggleName='toggleProducer'
      placeholder={props.placeholder || 'Select producers'}
      searchPlaceholder='Search producers...'
    />
  );
}
