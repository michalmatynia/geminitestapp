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
export * from './settings/campaigns';

export {
  normalizeFilemakerDatabase,
  createDefaultFilemakerDatabase,
  toPersistedFilemakerDatabase,
} from './filemaker-settings.database';
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
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  formatFilemakerAddress,
} from './filemaker-settings.entities';
