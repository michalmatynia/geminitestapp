import { toTrimmedString } from './template-helpers';

export type EntityNameLookup = Record<string, string> | Map<string, string> | null | undefined;
export type {
  EntityNameLookup as ProducerNameLookup,
  EntityNameLookup as ProducerExternalIdLookup,
  EntityNameLookup as TagNameLookup,
  EntityNameLookup as TagExternalIdLookup,
};
export type ProducerLookup = EntityNameLookup;
export type TagLookup = ProducerLookup;
export type EntityLookup = ProducerLookup | TagLookup;

export const getLookupValue = (lookup: EntityLookup, key: string): string | null => {
  if (!lookup) return null;
  if (lookup instanceof Map) {
    return toTrimmedString(lookup.get(key)) ?? toTrimmedString(lookup.get(key.toLowerCase()));
  }
  return toTrimmedString(lookup[key]) ?? toTrimmedString(lookup[key.toLowerCase()]);
};

export const getLookupEntries = (lookup: EntityLookup): Array<[string, string]> => {
  if (!lookup) return [];
  if (lookup instanceof Map) {
    return Array.from(lookup.entries())
      .map(([key, value]: [string, string]): [string, string] | null => {
        const normalizedKey = toTrimmedString(key);
        const normalizedValue = toTrimmedString(value);
        if (!normalizedKey || !normalizedValue) return null;
        return [normalizedKey, normalizedValue];
      })
      .filter((entry): entry is [string, string] => entry !== null);
  }
  return Object.entries(lookup)
    .map(([key, value]: [string, string]): [string, string] | null => {
      const normalizedKey = toTrimmedString(key);
      const normalizedValue = toTrimmedString(value);
      if (!normalizedKey || !normalizedValue) return null;
      return [normalizedKey, normalizedValue];
    })
    .filter((entry): entry is [string, string] => entry !== null);
};

export const getProducerNameFromLookup = (
  producerId: string,
  producerNameById?: EntityNameLookup
): string | null => {
  return getLookupValue(producerNameById, producerId);
};

export const getProducerExternalIdFromLookup = (
  internalProducerId: string,
  producerExternalIdByInternalId?: EntityNameLookup
): string | null => {
  return getLookupValue(producerExternalIdByInternalId, internalProducerId);
};

export const getTagNameFromLookup = (
  tagId: string,
  tagNameById?: EntityNameLookup
): string | null => {
  return getLookupValue(tagNameById, tagId);
};

export const getTagExternalIdFromLookup = (
  internalTagId: string,
  tagExternalIdByInternalId?: EntityNameLookup
): string | null => {
  return getLookupValue(tagExternalIdByInternalId, internalTagId);
};

export const buildProducerNameToExternalIdLookup = (
  producerNameById?: EntityNameLookup,
  producerExternalIdByInternalId?: EntityNameLookup
): Map<string, string> => {
  const result = new Map<string, string>();
  if (!producerNameById || !producerExternalIdByInternalId) return result;

  for (const [internalProducerId, externalProducerId] of getLookupEntries(
    producerExternalIdByInternalId
  )) {
    const producerName = getProducerNameFromLookup(internalProducerId, producerNameById);
    if (!producerName) continue;
    const key = producerName.toLowerCase();
    if (!result.has(key)) {
      result.set(key, externalProducerId);
    }
  }

  return result;
};

export const buildTagNameToExternalIdLookup = (
  tagNameById?: EntityNameLookup,
  tagExternalIdByInternalId?: EntityNameLookup
): Map<string, string> => {
  const result = new Map<string, string>();
  if (!tagNameById || !tagExternalIdByInternalId) return result;

  for (const [internalTagId, externalTagId] of getLookupEntries(tagExternalIdByInternalId)) {
    const tagName = getTagNameFromLookup(internalTagId, tagNameById);
    if (!tagName) continue;
    const key = tagName.toLowerCase();
    if (!result.has(key)) {
      result.set(key, externalTagId);
    }
  }

  return result;
};
