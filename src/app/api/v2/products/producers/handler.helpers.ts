import type { Producer, ProducerCreateInput } from '@/shared/contracts/products';
import { conflictError } from '@/shared/errors/app-error';

export type ProducerCreateNameLookupInput = {
  name: string;
};

export const buildProducerCreateNameLookupInput = (
  data: ProducerCreateInput
): ProducerCreateNameLookupInput => ({
  name: data.name.trim(),
});

export const assertAvailableProducerCreateName = (
  existing: Pick<Producer, 'id'> | null,
  lookup: ProducerCreateNameLookupInput
): void => {
  if (!existing) return;

  throw conflictError('A producer with this name already exists', {
    name: lookup.name,
    producerId: existing.id,
  });
};

export const buildProducerCreateInput = (
  data: ProducerCreateInput
): ProducerCreateInput => ({
  name: data.name.trim(),
  website: data.website ?? null,
});
