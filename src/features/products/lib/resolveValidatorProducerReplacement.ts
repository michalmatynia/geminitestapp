import type { Producer } from '@/shared/contracts/products/producers';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeComparableText = (value: unknown): string =>
  toTrimmedString(value).toLowerCase().replace(/\s+/g, ' ');

const normalizeComparableWebsite = (value: unknown): string =>
  normalizeComparableText(value)
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

const splitReplacementTokens = (value: string): string[] => {
  const parts = value
    .split(/[\n;,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts : [value.trim()].filter((part) => part.length > 0);
};

const getProducerComparableValues = (producer: Producer): string[] => {
  const normalizedId = normalizeComparableText(producer.id);
  const normalizedName = normalizeComparableText(producer.name);
  const normalizedWebsite = normalizeComparableWebsite(producer.website);

  return [normalizedId, normalizedName, normalizedWebsite].filter((value) => value.length > 0);
};

const resolveSingleProducerId = (
  token: string,
  producers: ReadonlyArray<Producer>
): string | null => {
  const normalizedToken = normalizeComparableWebsite(token);
  if (normalizedToken.length === 0) return null;

  for (const producer of producers) {
    if (getProducerComparableValues(producer).includes(normalizedToken)) {
      const producerId = toTrimmedString(producer.id);
      return producerId.length > 0 ? producerId : null;
    }
  }

  return null;
};

export const buildProducerNameById = (
  producers: ReadonlyArray<Producer> | undefined
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const producer of producers ?? []) {
    const producerId = toTrimmedString(producer.id);
    if (producerId.length === 0) continue;
    const producerName = toTrimmedString(producer.name);
    map.set(producerId, producerName.length > 0 ? producerName : producerId);
  }

  return map;
};

export const formatProducerDisplayValue = ({
  producerIds,
  producers,
  producerNameById,
  fallbackValue = '',
}: {
  producerIds: ReadonlyArray<string>;
  producers?: ReadonlyArray<Producer>;
  producerNameById?: ReadonlyMap<string, string>;
  fallbackValue?: string;
}): string => {
  const normalizedProducerIds = Array.from(
    new Set(
      producerIds
        .map((producerId) => toTrimmedString(producerId))
        .filter((producerId) => producerId.length > 0)
    )
  );

  if (normalizedProducerIds.length === 0) {
    return toTrimmedString(fallbackValue);
  }

  const localProducerNameById = producerNameById ?? buildProducerNameById(producers);
  return normalizedProducerIds
    .map((producerId) => localProducerNameById.get(producerId) ?? producerId)
    .join(', ');
};

export const resolveValidatorProducerReplacementIds = (
  replacementValue: string | null | undefined,
  producers: ReadonlyArray<Producer> | undefined
): string[] | null => {
  if (!Array.isArray(producers) || producers.length === 0) {
    return null;
  }

  const normalizedReplacement = toTrimmedString(replacementValue);
  if (normalizedReplacement.length === 0) return null;

  const nextIds: string[] = [];
  const seenIds = new Set<string>();
  for (const token of splitReplacementTokens(normalizedReplacement)) {
    const resolvedProducerId = resolveSingleProducerId(token, producers);
    if (resolvedProducerId === null) {
      return null;
    }
    if (seenIds.has(resolvedProducerId)) {
      continue;
    }
    seenIds.add(resolvedProducerId);
    nextIds.push(resolvedProducerId);
  }

  return nextIds.length > 0 ? nextIds : null;
};
