import { type CaseResolverSettings } from '@/shared/contracts/case-resolver';
import { DEFAULT_CASE_RESOLVER_SETTINGS } from '../settings.constants';
import {
  normalizeCaseResolverDefaultDocumentFormatValue,
  normalizeCaseResolverPartySearchKindValue,
} from '../settings.helpers';

const isSettingsRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const readTrimmedString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
};

const readOcrPrompt = (record: Record<string, unknown>): string => {
  const prompt = readTrimmedString(record, 'ocrPrompt');
  return prompt.length > 0 ? prompt : DEFAULT_CASE_RESOLVER_SETTINGS.ocrPrompt;
};

const readConfirmDeleteDocument = (record: Record<string, unknown>): boolean => {
  const value = record['confirmDeleteDocument'];
  return typeof value === 'boolean' ? value : DEFAULT_CASE_RESOLVER_SETTINGS.confirmDeleteDocument;
};

export const normalizeCaseResolverSettings = (input: unknown): CaseResolverSettings => {
  if (typeof input === 'string') return DEFAULT_CASE_RESOLVER_SETTINGS;
  if (!isSettingsRecord(input)) {
    return DEFAULT_CASE_RESOLVER_SETTINGS;
  }
  const record = input;
  const ocrModel = readTrimmedString(record, 'ocrModel');
  const ocrPrompt = readOcrPrompt(record);
  const rawFormatCandidate =
    typeof record['defaultDocumentFormat'] === 'string' ? record['defaultDocumentFormat'] : null;
  const normalizedDefaultDocumentFormat =
    normalizeCaseResolverDefaultDocumentFormatValue(rawFormatCandidate);
  const normalizedDefaultAddresserPartyKind = normalizeCaseResolverPartySearchKindValue(
    record['defaultAddresserPartyKind']
  );
  const normalizedDefaultAddresseePartyKind = normalizeCaseResolverPartySearchKindValue(
    record['defaultAddresseePartyKind']
  );

  return {
    ...DEFAULT_CASE_RESOLVER_SETTINGS,
    ocrModel,
    ocrPrompt,
    defaultDocumentFormat: normalizedDefaultDocumentFormat ?? DEFAULT_CASE_RESOLVER_SETTINGS.defaultDocumentFormat,
    confirmDeleteDocument: readConfirmDeleteDocument(record),
    defaultAddresserPartyKind:
      normalizedDefaultAddresserPartyKind ??
      DEFAULT_CASE_RESOLVER_SETTINGS.defaultAddresserPartyKind,
    defaultAddresseePartyKind:
      normalizedDefaultAddresseePartyKind ??
      DEFAULT_CASE_RESOLVER_SETTINGS.defaultAddresseePartyKind,
  };
};
