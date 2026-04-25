import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import type {
  FilemakerDatabase,
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from './types';

export const mergeImportedFilemakerValueRows = (input: {
  importedLinks: FilemakerValueParameterLink[];
  importedParameters: FilemakerValueParameter[];
  importedValues: FilemakerValue[];
  normalizedDatabase: FilemakerDatabase;
}): FilemakerDatabase => {
  const importedValueIds = new Set(input.importedValues.map((value) => value.id));
  const importedParameterIds = new Set(
    input.importedParameters.map((parameter) => parameter.id)
  );
  const importedLinkLegacyKeys = new Set(
    input.importedLinks.map(
      (link) => `${link.legacyValueUuid ?? ''}:${link.legacyParameterUuid ?? ''}`
    )
  );

  return normalizeFilemakerDatabase({
    ...input.normalizedDatabase,
    values: [
      ...input.normalizedDatabase.values.filter((value) => !importedValueIds.has(value.id)),
      ...input.importedValues,
    ],
    valueParameters: [
      ...input.normalizedDatabase.valueParameters.filter(
        (parameter) => !importedParameterIds.has(parameter.id)
      ),
      ...input.importedParameters,
    ],
    valueParameterLinks: [
      ...input.normalizedDatabase.valueParameterLinks.filter((link) => {
        const legacyKey = `${link.legacyValueUuid ?? ''}:${link.legacyParameterUuid ?? ''}`;
        return !importedLinkLegacyKeys.has(legacyKey);
      }),
      ...input.importedLinks,
    ],
  });
};
