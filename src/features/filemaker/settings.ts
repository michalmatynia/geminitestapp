/**
 * Filemaker Settings Utilities
 *
 * Provides functions for parsing and manipulating the Filemaker database
 * stored in system settings.
 */

export * from './settings-constants';
export * from './settings/database-getters';
export * from './settings/party-getters';
export * from './settings/upsert-logic';
export * from './settings/removal-logic';
export * from './settings/campaign-scheduling';
export * from './settings/campaigns';

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
export {
  importFilemakerLegacyOrganiserRows,
  importFilemakerLegacyOrganisersExport,
  parseFilemakerLegacyOrganiserRows,
} from './filemaker-organisers-import';
export { importFilemakerLegacyOrganisersWorkbook } from './filemaker-organisers-import.workbook';
export type {
  FilemakerLegacyValueImportIdKind,
  FilemakerLegacyValueImportOptions,
  FilemakerLegacyValuesImportResult,
} from './filemaker-values-import';
export type {
  FilemakerLegacyOrganiserImportIdKind,
  FilemakerLegacyOrganiserImportOptions,
  FilemakerLegacyOrganisersImportResult,
} from './filemaker-organisers-import';
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
  createFilemakerOrganization,
  createFilemakerOrganizationLegacyDemand,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  createFilemakerValue,
  createFilemakerValueParameter,
  createFilemakerValueParameterLink,
  formatFilemakerAddress,
} from './filemaker-settings.entities';
export * from './settings/campaign-factories';
