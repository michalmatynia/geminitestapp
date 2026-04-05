type ProductTriggerPublicationStatus = 'published' | 'draft';

const normalizeTriggerStatusValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveTriggerPublicationStatus = (
  value: unknown
): ProductTriggerPublicationStatus | null => {
  if (typeof value !== 'boolean') return null;
  return value ? 'published' : 'draft';
};

const applyTriggerPublicationStatusIfMissing = (
  entityJson: Record<string, unknown>,
  publicationStatus: ProductTriggerPublicationStatus
): void => {
  if (typeof entityJson['publicationStatus'] !== 'string') {
    entityJson['publicationStatus'] = publicationStatus;
  }
};

export const normalizeProductTriggerStatus = (entityJson: Record<string, unknown>): void => {
  const existingStatus = normalizeTriggerStatusValue(entityJson['status']);
  const derivedPublicationStatus = resolveTriggerPublicationStatus(entityJson['published']);

  if (existingStatus) {
    entityJson['status'] = existingStatus;
    if (derivedPublicationStatus) {
      applyTriggerPublicationStatusIfMissing(entityJson, derivedPublicationStatus);
    }
    return;
  }

  if (!derivedPublicationStatus) return;

  entityJson['status'] = derivedPublicationStatus;
  applyTriggerPublicationStatusIfMissing(entityJson, derivedPublicationStatus);
};
