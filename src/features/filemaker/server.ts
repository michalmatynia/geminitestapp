/**
 * Filemaker Feature - Server Entry Point
 *
 * This is the server-side entry point for the filemaker feature.
 * It must only be imported into server-side code (Node.js runtime).
 */

/** Re-exports filemaker mail service for server-side use */
export * from './server/filemaker-mail-service';

/** Re-exports filemaker mail access utilities */
export * from './server/filemaker-mail-access';

/** Re-exports the filemaker email repository */
export * from './server/filemaker-email-repository';

/** Re-exports the filemaker email list repository */
export * from './server/filemaker-email-list-repository';

/** Re-exports the filemaker email person upsert service */
export * from './server/filemaker-email-person-upsert';

/** Re-exports the filemaker website repository */
export * from './server/filemaker-website-repository';

/** Re-exports the filemaker anyparam repository */
export * from './server/filemaker-anyparam-repository';

/** Re-exports the filemaker anytext repository */
export * from './server/filemaker-anytext-repository';

/** Re-exports the filemaker bank account repository */
export * from './server/filemaker-bank-account-repository';

/** Re-exports the filemaker contract repository */
export * from './server/filemaker-contract-repository';

/** Re-exports the filemaker CV repository */
export * from './server/filemaker-cv-repository';

/** Re-exports the filemaker CV PDF generator */
export * from './server/filemaker-cv-pdf';

/** Re-exports the filemaker job application repository */
export * from './server/filemaker-job-application-repository';

/** Re-exports the filemaker job application manual utilities */
export * from './server/filemaker-job-application-manual';

/** Re-exports the filemaker job application apply run repository */
export * from './server/filemaker-job-application-apply-run-repository';

/** Re-exports the filemaker job application PDF generator */
export * from './server/filemaker-job-application-pdf';

/** Re-exports the filemaker document repository */
export * from './server/filemaker-document-repository';

/** Re-exports the filemaker person occupation repository */
export * from './server/filemaker-person-occupation-repository';

/** Re-exports the filemaker contact log repository */
export * from './server/filemaker-contact-log-repository';

/** Re-exports the filemaker values repository */
export * from './server/filemaker-values-repository';

/** Re-exports the filemaker organizations repository */
export * from './server/filemaker-organizations-repository';

/** Re-exports the filemaker persons repository */
export * from './server/filemaker-persons-repository';

/** Re-exports the filemaker events repository */
export * from './server/filemaker-events-repository';

/** Re-exports the filemaker invoices repository */
export * from './server/filemaker-invoices-repository';

/** Re-exports the filemaker invoice PDF generator */
export * from './server/filemaker-invoice-pdf';

/** Re-exports the filemaker party snapshot repository */
export * from './server/filemaker-party-snapshot-repository';

/**
 * Mongo-specific filemaker address utilities
 */
export {
  listMongoFilemakerAddressesForOrganization,
  listMongoFilemakerAddressesForOwner,
  updateMongoFilemakerAddressesForOwner,
} from './server/filemaker-organizations-mongo';

/** Re-exports the campaign runtime engine */
export * from './server/campaign-runtime';

/** Re-exports campaign mail filing repair utilities */
export * from './server/campaign-mail-filing-repair';

/**
 * Filemaker email campaign scheduler service and related types
 */
export {
  createFilemakerEmailCampaignSchedulerService,
  resolveDueFilemakerEmailCampaigns,
  runFilemakerEmailCampaignSchedulerTick,
  type FilemakerEmailCampaignSchedulerDueCampaign,
  type FilemakerEmailCampaignSchedulerTickResult,
} from './server/filemakerEmailCampaignScheduler';

/**
 * Campaign retry scheduler utilities and types
 */
export {
  resolveDueFilemakerEmailCampaignRetryRuns,
  type FilemakerEmailCampaignSchedulerDueRetryRun,
} from './server/campaign-retry-scheduler';

/** Re-exports the filemaker email campaign test send service */
export * from './server/filemaker-email-campaign-test-send';

/**
 * Campaign settings store utilities
 */
export {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './server/campaign-settings-store';

/**
 * Campaign unsubscribe token and URL builders
 */
export {
  createFilemakerCampaignUnsubscribeToken,
  parseFilemakerCampaignUnsubscribeToken,
  buildFilemakerCampaignUnsubscribeUrl,
  buildFilemakerCampaignOneClickUnsubscribeUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignClickTrackingUrl,
} from './server/campaign-unsubscribe-token';

/**
 * Campaign suppression list utilities
 */
export {
  filterFilemakerMailSuppressionEntries,
  findFilemakerMailSuppressionEntry,
  isFilemakerMailAddressSuppressed,
  loadFilemakerMailSuppressionEntries,
  recordFilemakerMailBounceSuppressions,
  recordFilemakerMailComplaintSuppressions,
  removeFilemakerMailSuppressionEntry,
} from './server/campaign-suppression';

/**
 * Campaign engagement pruning utilities
 */
export {
  findFilemakerCampaignColdRecipients,
  pruneFilemakerCampaignColdRecipients,
  type FilemakerCampaignColdRecipient,
} from './server/campaign-engagement-pruning';

/** Re-exports filemaker settings */
export * from './settings';

/** Re-exports filemaker types */
export * from './types';
