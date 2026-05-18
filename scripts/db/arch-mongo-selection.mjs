export const parseDbNameFromUri = (uri, fallback) => {
  try {
    const parsed = new URL(uri);
    const dbName = parsed.pathname.replace(/^\//, '').trim();
    return dbName || fallback;
  } catch {
    return fallback;
  }
};

export const buildMongoOptions = (uri) => ({
  ...(uri.startsWith('mongodb+srv://') ? {} : { directConnection: true }),
  serverSelectionTimeoutMS: 3000,
});

const sourceCollections = [
  {
    name: 'milkbar_page_content',
    filter: {},
    scope: 'milkbar-source-page-content',
    naturalKeys: ['key'],
  },
  {
    name: 'milkbar_projects',
    filter: {},
    scope: 'milkbar-source-projects',
    naturalKeys: ['code'],
  },
  {
    name: 'milkbar_services',
    filter: {},
    scope: 'milkbar-source-services',
    naturalKeys: ['code'],
  },
];

export const runtimePageContentFilter = {
  key: 'home',
  $or: [
    { 'pageSettings.seo.en.title': /milkbar|architecture|ai studio/i },
    { 'pageSettings.seo.de.title': /milkbar|architektur|ki/i },
    { 'pageSettings.seo.pl.title': /milkbar|architekt/i },
    { 'localizedContent.en.hero.lede': /architecture|machine learning|drawing/i },
    { 'localizedContent.de.hero.lede': /architektur|zeichnung|automatis/i },
    { 'localizedContent.pl.hero.lede': /architektur|rysunek|automatyz/i },
  ],
};

export const runtimeProjectsFilter = {
  $or: [
    { code: /^MBD-/ },
    { projectType: /architecture|residential|mixed-use|cultural|tower|ensemble/i },
    { description: /architect|building code|massing|drawings|regulations/i },
  ],
};

export const runtimeServicesFilter = {
  $and: [
    { code: /^S-0[1-4]$/ },
    {
      $or: [
        { title: /compliance intelligence|generative massing|document automation|project intelligence/i },
        { description: /regulations|massing|drawing|architect|project manager/i },
      ],
    },
  ],
};

export const runtimeInquiriesFilter = {
  $or: [
    { applicationId: 'arch' },
    { applicationName: /milkbar|milkbardesigners/i },
    { app: /milkbar|milkbardesigners|arch-web/i },
    { site: /milkbar|milkbardesigners|arch-web/i },
    { source: /milkbar|milkbardesigners|arch-web/i },
    { origin: /milkbar|milkbardesigners|arch-web/i },
  ],
};

export const archSettingsFilter = {
  $or: [
    { key: /milkbar|milkbardesigners|arch_web|arch-web|^mbd[_-]/i },
    { _id: /milkbar|milkbardesigners|arch_web|arch-web|^mbd[_-]/i },
  ],
};

export const archAnalyticsFilter = {
  $or: [
    { path: /^\/(milkbardesigners|[a-z]{2}\/milkbardesigners)(\/|$)/ },
    { route: /^\/(milkbardesigners|[a-z]{2}\/milkbardesigners)(\/|$)/ },
    { page: /^\/(milkbardesigners|[a-z]{2}\/milkbardesigners)(\/|$)/ },
    { applicationId: 'arch' },
  ],
};

export const archSystemLogsFilter = {
  $or: [
    { applicationId: 'arch' },
    { applicationName: /milkbar|milkbardesigners/i },
    { source: /milkbar|milkbardesigners|arch-web/i },
    { service: /milkbar|milkbardesigners|arch-web/i },
    { message: /milkbar|milkbardesigners|arch-web/i },
    { path: /milkbardesigners|\/arch(\/|$)/i },
    { route: /milkbardesigners|\/arch(\/|$)/i },
    { 'context.applicationId': 'arch' },
    { 'context.source': /milkbar|milkbardesigners|arch-web/i },
    { 'context.service': /milkbar|milkbardesigners|arch-web/i },
    { 'context.route': /milkbardesigners|\/arch(\/|$)/i },
    { 'context.path': /milkbardesigners|\/arch(\/|$)/i },
    { 'context.endpoint': /milkbardesigners|\/arch(\/|$)/i },
  ],
};

export const archActivityLogsFilter = {
  $or: [
    { applicationId: 'arch' },
    { applicationName: /milkbar|milkbardesigners/i },
    { type: /milkbar|milkbardesigners|arch-web/i },
    { description: /milkbar|milkbardesigners|arch-web/i },
    { entityType: /milkbar|milkbardesigners|arch-web/i },
    { 'metadata.applicationId': 'arch' },
    { 'metadata.source': /milkbar|milkbardesigners|arch-web/i },
    { 'metadata.service': /milkbar|milkbardesigners|arch-web/i },
    { 'metadata.surface': /milkbar|milkbardesigners|arch-web/i },
  ],
};

const runtimeCollections = [
  {
    name: 'page_content',
    filter: runtimePageContentFilter,
    scope: 'milkbar-runtime-page-content',
    naturalKeys: ['key'],
  },
  {
    name: 'projects',
    filter: runtimeProjectsFilter,
    scope: 'milkbar-runtime-projects',
    naturalKeys: ['code'],
  },
  {
    name: 'services',
    filter: runtimeServicesFilter,
    scope: 'milkbar-runtime-services',
    naturalKeys: ['code'],
  },
  {
    name: 'inquiries',
    filter: runtimeInquiriesFilter,
    scope: 'milkbar-runtime-inquiries',
    naturalKeys: ['email'],
  },
  {
    name: 'settings',
    filter: archSettingsFilter,
    scope: 'milkbar-settings',
    naturalKeys: ['key'],
  },
  {
    name: 'analytics_events',
    filter: archAnalyticsFilter,
    scope: 'milkbar-analytics',
    naturalKeys: [],
  },
  {
    name: 'system_logs',
    filter: archSystemLogsFilter,
    scope: 'milkbar-system-logs',
    naturalKeys: ['originLogId', 'id'],
    normalizeForArch: true,
  },
  {
    name: 'error_logs',
    filter: archSystemLogsFilter,
    scope: 'milkbar-error-logs',
    naturalKeys: ['originLogId', 'id'],
    normalizeForArch: true,
  },
  {
    name: 'activity_logs',
    filter: archActivityLogsFilter,
    scope: 'milkbar-activity-logs',
    naturalKeys: ['originLogId'],
    normalizeForArch: true,
  },
];

export const collectArchMongoSelections = async (sourceDb) => {
  const sourceCollectionsList = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const sourceCollectionNames = new Set(sourceCollectionsList.map((item) => item.name));
  const selections = [...sourceCollections, ...runtimeCollections]
    .filter(({ name }) => sourceCollectionNames.has(name))
    .map((selection) => ({ ...selection }));

  return { sourceCollectionNames, selections };
};
