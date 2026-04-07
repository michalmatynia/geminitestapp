import type { Producer, ProducerUpdateInput } from '@/shared/contracts/products/producers';
import { conflictError, validationError } from '@/shared/errors/app-error';
import type { NameLookupDto } from '@/shared/contracts/base';

const paramsSchema = z.object({
  id: z.string().trim().min(1, 'Producer id is required'),
});

type ProducerSnapshot = Pick<Producer, 'id'>;

export type ProducerNameLookupInput = NameLookupDto;

const normalizeProducerName = (name: string | undefined): string | undefined =>
  typeof name === 'string' ? name.trim() : undefined;

export const parseProducerId = (params: { id: string }): string => {
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data.id;
};

export const buildProducerNameLookupInput = (
  data: ProducerUpdateInput
): ProducerNameLookupInput | null => {
  const normalizedName = normalizeProducerName(data.name);
  if (!normalizedName) return null;

  return {
    name: normalizedName,
  };
};

export const assertAvailableProducerName = (
  existing: ProducerSnapshot | null,
  producerId: string,
  lookup: ProducerNameLookupInput
): void => {
  if (!existing || existing.id === producerId) return;

  throw conflictError('A producer with this name already exists', {
    name: lookup.name,
    producerId: existing.id,
  });
};

export const buildProducerUpdateInput = (data: ProducerUpdateInput): ProducerUpdateInput => {
  const normalizedName = normalizeProducerName(data.name);

  return {
    ...(data.name !== undefined ? { name: normalizedName } : {}),
    ...(data.website !== undefined ? { website: data.website } : {}),
  };
};
