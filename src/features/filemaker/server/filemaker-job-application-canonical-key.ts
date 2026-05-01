export const buildFilemakerJobApplicationCanonicalKey = (input: {
  connectionId?: string | null;
  integrationId?: string | null;
  integrationSlug?: string | null;
  jobListingId: string;
  organizationId: string;
  personId: string;
}): string => {
  const integrationKey =
    [input.integrationSlug, input.integrationId, input.connectionId]
      .map((value) => value?.trim() ?? '')
      .find((value) => value.length > 0) ?? 'default';
  return [
    input.personId.trim(),
    input.organizationId.trim(),
    input.jobListingId.trim(),
    integrationKey,
  ].join('::');
};
