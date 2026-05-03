import {
  createFilemakerValue,
  createFilemakerValueParameter,
  createFilemakerValueParameterLink,
} from './filemaker-settings.entities';
import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import { resolveImportedValueAuditFields } from './filemaker-values-import.audit';
import { mergeImportedFilemakerValueRows } from './filemaker-values-import.merge';
import {
  normalizeLegacyUuid,
  parseFilemakerLegacyValueRows,
  parseParametersFromRow,
  parseValueFromRow,
  type LegacyValueRow,
  type ParsedLegacyParameter,
  type ParsedLegacyValue,
} from './filemaker-values-import.parser';
import type {
  FilemakerDatabase,
  FilemakerValue,
  FilemakerValueParameter,
  FilemakerValueParameterLink,
} from './types';
export { parseFilemakerLegacyValueRows } from './filemaker-values-import.parser';

export type FilemakerLegacyValueImportIdKind = 'value' | 'value-parameter' | 'value-parameter-link';

export type FilemakerLegacyValueImportOptions = {
  createId?: (kind: FilemakerLegacyValueImportIdKind, legacyKey: string) => string;
};

export type FilemakerLegacyValuesImportResult = {
  database: FilemakerDatabase;
  importedValueCount: number;
  importedParameterCount: number;
  importedLinkCount: number;
  skippedRowCount: number;
  valueLegacyUuidToId: Record<string, string>;
  parameterLegacyUuidToId: Record<string, string>;
};
type CollectedImportRows = {
  links: Array<{ legacyParameterUuid: string; legacyValueUuid: string }>;
  parameters: Map<string, ParsedLegacyParameter>;
  skippedRowCount: number;
  values: Map<string, ParsedLegacyValue>;
};

const createRandomModernId = (kind: FilemakerLegacyValueImportIdKind): string =>
  `filemaker-${kind}-${globalThis.crypto.randomUUID()}`;

const createModernId = (
  kind: FilemakerLegacyValueImportIdKind,
  legacyKey: string,
  options: FilemakerLegacyValueImportOptions
): string => options.createId?.(kind, legacyKey) ?? createRandomModernId(kind);

const buildExistingValueIdMap = (database: FilemakerDatabase): Map<string, string> =>
  new Map(
    database.values
      .map((value: FilemakerValue): [string, string] => [
        normalizeLegacyUuid(value.legacyUuid),
        value.id,
      ])
      .filter(([legacyUuid]: [string, string]): boolean => legacyUuid.length > 0)
  );

const buildExistingParameterIdMap = (database: FilemakerDatabase): Map<string, string> =>
  new Map(
    database.valueParameters
      .map((parameter: FilemakerValueParameter): [string, string] => [
        normalizeLegacyUuid(parameter.legacyUuid),
        parameter.id,
      ])
      .filter(([legacyUuid]: [string, string]): boolean => legacyUuid.length > 0)
  );

const buildExistingLinkIdMap = (database: FilemakerDatabase): Map<string, string> =>
  new Map(
    database.valueParameterLinks
      .map((link: FilemakerValueParameterLink): [string, string] => [
        `${normalizeLegacyUuid(link.legacyValueUuid)}:${normalizeLegacyUuid(
          link.legacyParameterUuid
        )}`,
        link.id,
      ])
      .filter(([legacyKey]: [string, string]): boolean => !legacyKey.startsWith(':'))
  );

const resolveParentId = (
  value: ParsedLegacyValue,
  valueIdByLegacyUuid: Map<string, string>
): string | null => {
  const legacyParentUuid = value.legacyParentUuids
    .slice()
    .reverse()
    .find(
      (candidate: string): boolean =>
        candidate !== value.legacyUuid && valueIdByLegacyUuid.has(candidate)
    );
  return legacyParentUuid === undefined ? null : valueIdByLegacyUuid.get(legacyParentUuid) ?? null;
};

const createEmptyCollection = (): CollectedImportRows => ({
  links: [],
  parameters: new Map(),
  skippedRowCount: 0,
  values: new Map(),
});

const hasLink = (
  collection: CollectedImportRows,
  legacyValueUuid: string,
  legacyParameterUuid: string
): boolean =>
  collection.links.some(
    (link) =>
      link.legacyValueUuid === legacyValueUuid && link.legacyParameterUuid === legacyParameterUuid
  );

const addParameterLink = (input: {
  collection: CollectedImportRows;
  currentValueLegacyUuid: string;
  parameter: ParsedLegacyParameter;
  value: ParsedLegacyValue | null;
}): void => {
  const legacyValueUuid = input.value?.legacyUuid ?? input.currentValueLegacyUuid;
  if (legacyValueUuid.length === 0) return;
  if (hasLink(input.collection, legacyValueUuid, input.parameter.legacyUuid)) return;
  input.collection.links.push({
    legacyParameterUuid: input.parameter.legacyUuid,
    legacyValueUuid,
  });
};

const collectLegacyValueImportRows = (rows: LegacyValueRow[]): CollectedImportRows => {
  const collection = createEmptyCollection();
  let currentValueLegacyUuid = '';

  rows.forEach((row: LegacyValueRow, index: number): void => {
    const value = parseValueFromRow(row, index);
    if (value !== null) {
      currentValueLegacyUuid = value.legacyUuid;
      collection.values.set(value.legacyUuid, value);
    } else if (currentValueLegacyUuid.length === 0) {
      collection.skippedRowCount += 1;
    }

    parseParametersFromRow(row).forEach((parameter: ParsedLegacyParameter): void => {
      const existingParameter = collection.parameters.get(parameter.legacyUuid);
      if (
        existingParameter === undefined ||
        existingParameter.label === existingParameter.legacyUuid
      ) {
        collection.parameters.set(parameter.legacyUuid, parameter);
      }
      addParameterLink({ collection, currentValueLegacyUuid, parameter, value });
    });
  });

  return collection;
};

const toImportedValues = (
  values: ParsedLegacyValue[],
  normalizedDatabase: FilemakerDatabase,
  valueIdByLegacyUuid: Map<string, string>
): FilemakerValue[] =>
  values.map((value: ParsedLegacyValue): FilemakerValue => {
    const id = valueIdByLegacyUuid.get(value.legacyUuid) ?? '';
    const existingValue = normalizedDatabase.values.find((entry) => entry.id === id);
    const auditFields = resolveImportedValueAuditFields(value, existingValue);
    return createFilemakerValue({
      id,
      parentId: resolveParentId(value, valueIdByLegacyUuid),
      label: value.label,
      value: value.label,
      sortOrder: value.sortOrder,
      legacyUuid: value.legacyUuid,
      legacyParentUuids: value.legacyParentUuids,
      legacyListUuids: value.legacyListUuids,
      ...auditFields,
    });
  });

const toImportedParameters = (
  parameters: ParsedLegacyParameter[],
  normalizedDatabase: FilemakerDatabase,
  parameterIdByLegacyUuid: Map<string, string>
): FilemakerValueParameter[] =>
  parameters.map((parameter: ParsedLegacyParameter): FilemakerValueParameter => {
    const id = parameterIdByLegacyUuid.get(parameter.legacyUuid) ?? '';
    const existingParameter = normalizedDatabase.valueParameters.find((entry) => entry.id === id);
    return createFilemakerValueParameter({
      id,
      label: parameter.label,
      legacyUuid: parameter.legacyUuid,
      createdAt: existingParameter?.createdAt,
      updatedAt: existingParameter?.updatedAt,
    });
  });

const toImportedLinks = (input: {
  collected: CollectedImportRows;
  linkIdByLegacyPair: Map<string, string>;
  options: FilemakerLegacyValueImportOptions;
  parameterIdByLegacyUuid: Map<string, string>;
  valueIdByLegacyUuid: Map<string, string>;
}): FilemakerValueParameterLink[] =>
  input.collected.links.flatMap((link): FilemakerValueParameterLink[] => {
    const valueId = input.valueIdByLegacyUuid.get(link.legacyValueUuid) ?? '';
    const parameterId = input.parameterIdByLegacyUuid.get(link.legacyParameterUuid) ?? '';
    if (valueId.length === 0 || parameterId.length === 0) return [];
    const legacyPair = `${link.legacyValueUuid}:${link.legacyParameterUuid}`;
    return [
      createFilemakerValueParameterLink({
        id:
          input.linkIdByLegacyPair.get(legacyPair) ??
          createModernId('value-parameter-link', legacyPair, input.options),
        valueId,
        parameterId,
        legacyValueUuid: link.legacyValueUuid,
        legacyParameterUuid: link.legacyParameterUuid,
      }),
    ];
  });

const ensureModernIds = (
  collected: CollectedImportRows,
  valueIdByLegacyUuid: Map<string, string>,
  parameterIdByLegacyUuid: Map<string, string>,
  options: FilemakerLegacyValueImportOptions
): void => {
  collected.values.forEach((value) => {
    if (!valueIdByLegacyUuid.has(value.legacyUuid)) {
      valueIdByLegacyUuid.set(value.legacyUuid, createModernId('value', value.legacyUuid, options));
    }
  });
  collected.parameters.forEach((parameter) => {
    if (!parameterIdByLegacyUuid.has(parameter.legacyUuid)) {
      parameterIdByLegacyUuid.set(
        parameter.legacyUuid,
        createModernId('value-parameter', parameter.legacyUuid, options)
      );
    }
  });
};
export const importFilemakerLegacyValueRows = (
  database: FilemakerDatabase | null | undefined,
  rows: LegacyValueRow[],
  options: FilemakerLegacyValueImportOptions = {}
): FilemakerLegacyValuesImportResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const collected = collectLegacyValueImportRows(rows);
  const valueIdByLegacyUuid = buildExistingValueIdMap(normalizedDatabase);
  const parameterIdByLegacyUuid = buildExistingParameterIdMap(normalizedDatabase);
  const linkIdByLegacyPair = buildExistingLinkIdMap(normalizedDatabase);
  ensureModernIds(collected, valueIdByLegacyUuid, parameterIdByLegacyUuid, options);

  const importedValues = toImportedValues(
    Array.from(collected.values.values()),
    normalizedDatabase,
    valueIdByLegacyUuid
  );
  const importedParameters = toImportedParameters(
    Array.from(collected.parameters.values()),
    normalizedDatabase,
    parameterIdByLegacyUuid
  );
  const importedLinks = toImportedLinks({
    collected,
    linkIdByLegacyPair,
    options,
    parameterIdByLegacyUuid,
    valueIdByLegacyUuid,
  });

  return {
    database: mergeImportedFilemakerValueRows({
      importedLinks,
      importedParameters,
      importedValues,
      normalizedDatabase,
    }),
    importedValueCount: importedValues.length,
    importedParameterCount: importedParameters.length,
    importedLinkCount: importedLinks.length,
    skippedRowCount: collected.skippedRowCount,
    valueLegacyUuidToId: Object.fromEntries(valueIdByLegacyUuid.entries()),
    parameterLegacyUuidToId: Object.fromEntries(parameterIdByLegacyUuid.entries()),
  };
};

export const importFilemakerLegacyValuesExport = (
  database: FilemakerDatabase | null | undefined,
  text: string,
  options: FilemakerLegacyValueImportOptions = {}
): FilemakerLegacyValuesImportResult =>
  importFilemakerLegacyValueRows(database, parseFilemakerLegacyValueRows(text), options);
