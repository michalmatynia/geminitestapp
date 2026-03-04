import React from 'react';

import type { Producer } from '@/shared/contracts/products';

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
  const { producers, selectedProducerIds, onChange, loading, disabled, placeholder } = props;

  return (
    <ProductMetadataMultiSelectField
      label='Producers'
      items={producers}
      selectedIds={selectedProducerIds}
      onChange={onChange}
      loading={loading}
      disabled={disabled}
      contextItemsKey='producers'
      contextSelectedKey='selectedProducerIds'
      contextLoadingKey='producersLoading'
      contextOnChangeKey='onProducersChange'
      formContextToggleName='toggleProducer'
      placeholder={placeholder || 'Select producers'}
      searchPlaceholder='Search producers...'
    />
  );
}
