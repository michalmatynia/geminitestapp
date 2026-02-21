import {
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
} from '@/features/filemaker/settings';

export type CaseResolverPartySelectOption = {
  value: string;
  label: string;
  description?: string | undefined;
};

export type DecodedFilemakerPartyReference = ReturnType<
  typeof decodeFilemakerPartyReference
>;

export const buildMissingSelectedPartyOption = (
  selectedReference: DecodedFilemakerPartyReference
): CaseResolverPartySelectOption | null => {
  if (!selectedReference) return null;
  const selectedValue = encodeFilemakerPartyReference(selectedReference);
  if (!selectedValue || selectedValue === 'none') return null;
  const kindLabel = selectedReference.kind === 'person' ? 'Person' : 'Organization';
  return {
    value: selectedValue,
    label: `${kindLabel}: ${selectedReference.id}`,
    description: 'Loaded from current document. Refreshing Filemaker records...',
  };
};
