'use client';

import { useContext } from 'react';

import { ProductFormContext } from '@/features/products/context/ProductFormContext';
import type { Producer } from '@/features/products/types';
import { internalError } from '@/shared/errors/app-error';
import { MultiSelect } from '@/shared/ui';

import { useOptionalProductMetadataFieldContext } from './ProductMetadataFieldContext';

type ProducerMultiSelectFieldProps = {
  producers?: Producer[] | undefined;
  selectedProducerIds?: string[] | undefined;
  onChange?: ((nextIds: string[]) => void) | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
};

export function ProducerMultiSelectField({
  producers: producersProp,
  selectedProducerIds: selectedProducerIdsProp,
  onChange: onChangeProp,
  loading = false,
  disabled = false,
  placeholder = 'Select producers',
}: ProducerMultiSelectFieldProps): React.JSX.Element {
  const formContext = useContext(ProductFormContext);
  const metadataContext = useOptionalProductMetadataFieldContext();
  const producers = producersProp ?? metadataContext?.producers ?? formContext?.producers ?? [];
  const selectedProducerIds =
    selectedProducerIdsProp ??
    metadataContext?.selectedProducerIds ??
    formContext?.selectedProducerIds ??
    [];
  const resolvedLoading = producersProp
    ? loading
    : (metadataContext?.producersLoading ?? formContext?.producersLoading ?? loading);
  const resolvedOnChange =
    onChangeProp ??
    metadataContext?.onProducersChange ??
    (formContext
      ? (nextIds: string[]): void => {
        const previous = new Set(formContext.selectedProducerIds);
        const next = new Set(nextIds);
        for (const id of nextIds) {
          if (!previous.has(id)) formContext.toggleProducer(id);
        }
        for (const id of formContext.selectedProducerIds) {
          if (!next.has(id)) formContext.toggleProducer(id);
        }
      }
      : null);

  if (!resolvedOnChange) {
    throw internalError(
      'ProducerMultiSelectField requires `onChange` prop when used outside ProductFormContext.'
    );
  }

  return (
    <MultiSelect
      label='Producers'
      options={producers.map((producer: Producer) => ({
        value: producer.id,
        label: producer.name,
      }))}
      selected={selectedProducerIds}
      onChange={resolvedOnChange}
      loading={resolvedLoading}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder='Search producers...'
    />
  );
}
