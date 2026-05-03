import { useMemo } from 'react';

export const useAmazonSelectorProfileOptions = (
  amazonSelectorProfile: string,
  registryProfiles: string[] | undefined
): string[] =>
  useMemo(
    (): string[] =>
      Array.from(
        new Set([
          'amazon',
          amazonSelectorProfile.trim() !== '' ? amazonSelectorProfile.trim() : 'amazon',
          ...(registryProfiles ?? []),
        ])
      ).sort((left, right) => left.localeCompare(right)),
    [amazonSelectorProfile, registryProfiles]
  );
