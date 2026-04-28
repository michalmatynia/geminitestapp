export const FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY =
  'filemaker_organization_presence_scrape' as const;

export const FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_NAME =
  'FileMaker Organisation Website and Social Scrape' as const;

export const FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS = {
  browserPreparation: 'browser_preparation',
  browserOpen: 'browser_open',
  inputValidate: 'filemaker_organization_presence_input_validate',
  searchWeb: 'filemaker_organization_presence_search_web',
  collectCandidates: 'filemaker_organization_presence_collect_candidates',
  probeWebsites: 'filemaker_organization_presence_probe_websites',
  extractSocialProfiles: 'filemaker_organization_presence_extract_social_profiles',
  finalize: 'filemaker_organization_presence_finalize',
  browserClose: 'browser_close',
} as const;

export const FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEP_IDS = [
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserPreparation,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserOpen,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.inputValidate,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.searchWeb,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.collectCandidates,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.probeWebsites,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.extractSocialProfiles,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.finalize,
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEPS.browserClose,
] as const;

export type FilemakerOrganizationPresenceScrapeRuntimeStepId =
  (typeof FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_STEP_IDS)[number];
