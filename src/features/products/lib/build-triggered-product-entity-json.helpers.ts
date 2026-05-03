type ProductTriggerPublicationStatus = 'published' | 'draft';
type ProductTriggerStatusFields = Partial<{
  status: string;
  publicationStatus: ProductTriggerPublicationStatus;
}>;

const normalizeTriggerStatusValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveTriggerPublicationStatus = (
  value: unknown
): ProductTriggerPublicationStatus | null => {
  if (typeof value !== 'boolean') return null;
  return value ? 'published' : 'draft';
};

const shouldApplyTriggerPublicationStatus = (entityJson: Record<string, unknown>): boolean =>
  typeof entityJson['publicationStatus'] !== 'string';

export const buildNormalizedProductTriggerStatusFields = (
  entityJson: Record<string, unknown>
): ProductTriggerStatusFields => {
  const existingStatus = normalizeTriggerStatusValue(entityJson['status']);
  const derivedPublicationStatus = resolveTriggerPublicationStatus(entityJson['published']);
  const fields: ProductTriggerStatusFields = {};

  if (existingStatus !== '') {
    fields.status = existingStatus;
    if (
      derivedPublicationStatus !== null &&
      shouldApplyTriggerPublicationStatus(entityJson)
    ) {
      fields.publicationStatus = derivedPublicationStatus;
    }
    return fields;
  }

  if (derivedPublicationStatus === null) return fields;

  fields.status = derivedPublicationStatus;
  if (shouldApplyTriggerPublicationStatus(entityJson)) {
    fields.publicationStatus = derivedPublicationStatus;
  }
  return fields;
};
