/**
 * Filemaker Settings Utilities
 *
 * Provides functions for parsing and manipulating the Filemaker database
 * stored in system settings.
 */

export * from './settings-constants';
export * from './settings/database-getters';
export * from './settings/party-getters';
export * from './settings/filemaker-country-options';
export * from './settings/upsert-logic';
export * from './settings/removal-logic';
export * from './settings/campaign-scheduling';
export * from './settings/campaigns';
export * from './filemaker-invoice-pdf-settings';
export * from './filemaker-job-application-settings';

export {
  normalizeFilemakerDatabase,
  createDefaultFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from './filemaker-settings.database';
export {
  importFilemakerLegacyValueRows,
  importFilemakerLegacyValuesExport,
  parseFilemakerLegacyValueRows,
} from './filemaker-values-import';
export { importFilemakerLegacyValuesWorkbook } from './filemaker-values-import.workbook';
export type {
  FilemakerLegacyValueImportIdKind,
  FilemakerLegacyValueImportOptions,
  FilemakerLegacyValuesImportResult,
} from './filemaker-values-import';
export {
  extractFilemakerEmailsFromText,
  parseFilemakerEmailParserRulesFromPromptSettings,
  validateFilemakerPhoneNumber,
} from './filemaker-settings.validation';
export {
  linkFilemakerAddressToOwner,
  linkFilemakerEmailToParty,
  linkFilemakerEventToOrganization,
  linkFilemakerPhoneNumberToParty,
  setFilemakerDefaultAddressForOwner,
  unlinkFilemakerAddressFromOwner,
  unlinkFilemakerEmailFromParty,
  unlinkFilemakerEventFromOrganization,
  unlinkFilemakerPhoneNumberFromParty,
} from './filemaker-settings.links';
export {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEmail,
  createFilemakerEmailLink,
  createFilemakerEvent,
  createFilemakerEventOrganizationLink,
  createDefaultFilemakerLexiconTypes,
  createDefaultFilemakerLexiconValidationPatterns,
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
  createFilemakerLexiconType,
  createFilemakerLexiconValidationPattern,
  createFilemakerOrganization,
  createFilemakerOrganizationLegacyDemand,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  createFilemakerValue,
  createFilemakerValueParameter,
  createFilemakerValueParameterLink,
  FILEMAKER_LEXICON_TYPE_DEFINITIONS,
  FILEMAKER_LEXICON_VALIDATION_PATTERN_DEFINITIONS,
  formatFilemakerAddress,
} from './filemaker-settings.entities';
export * from './settings/campaign-factories';
