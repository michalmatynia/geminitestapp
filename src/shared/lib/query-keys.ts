/**
 * Centralized Query Keys Factory for TanStack Query
 *
 * Pattern Guidelines:
 * - all: ['feature'] as const (base key for invalidating EVERYTHING in a feature)
 * - lists: () => [...all, 'list'] as const (base for all lists)
 * - list: (filters: unknown) => [...lists(), { filters }] as const (specific list)
 * - details: () => [...all, 'detail'] as const (base for all single items)
 * - detail: (id: string) => [...details(), id] as const (specific single item)
 */

export const QUERY_KEYS = {
  products: {
    all: ['products'] as const,
    lists: () => [...QUERY_KEYS.products.all, 'list'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.products.lists(), { filters }] as const,
    counts: () => [...QUERY_KEYS.products.all, 'count'] as const,
    count: (filters: unknown) => [...QUERY_KEYS.products.counts(), { filters }] as const,
    details: () => [...QUERY_KEYS.products.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.products.details(), id] as const,
    detailEdit: (id: string) => [...QUERY_KEYS.products.detail(id), 'edit'] as const,
    enhanced: () => [...QUERY_KEYS.products.all, 'enhanced'] as const,
    enhancedCount: () => [...QUERY_KEYS.products.all, 'enhanced-count'] as const,
    categoriesAll: () => [...QUERY_KEYS.products.all, 'categories'] as const,
    tagsAll: () => [...QUERY_KEYS.products.all, 'tags'] as const,
    validatorLatestProductSource: () =>
      [...QUERY_KEYS.products.all, 'validator', 'latest-product-source'] as const,
    aiJobs: {
      all: ['products', 'ai-jobs'] as const,
      lists: () => [...QUERY_KEYS.products.aiJobs.all, 'list'] as const,
      details: () => [...QUERY_KEYS.products.aiJobs.all, 'detail'] as const,
      detail: (id: string) => [...QUERY_KEYS.products.aiJobs.details(), id] as const,
    },
    metadata: {
      all: ['products', 'metadata'] as const,
      catalogs: () => [...QUERY_KEYS.products.metadata.all, 'catalogs'] as const,
      categories: (catalogId: string | null) =>
        [...QUERY_KEYS.products.metadata.all, 'categories', catalogId] as const,
      tags: (catalogId: string | null) =>
        [...QUERY_KEYS.products.metadata.all, 'tags', catalogId] as const,
      producers: () => [...QUERY_KEYS.products.metadata.all, 'producers'] as const,
      parameters: (catalogId: string | null) =>
        [...QUERY_KEYS.products.metadata.all, 'parameters', catalogId] as const,
      simpleParameters: (catalogId: string | null) =>
        [...QUERY_KEYS.products.metadata.all, 'simple-parameters', catalogId] as const,
      languages: () => [...QUERY_KEYS.products.metadata.all, 'languages'] as const,
      priceGroups: () => [...QUERY_KEYS.products.metadata.all, 'price-groups'] as const,
    },
    settings: {
      all: ['products', 'settings'] as const,
      priceGroups: () => [...QUERY_KEYS.products.settings.all, 'price-groups'] as const,
      catalogs: () => [...QUERY_KEYS.products.settings.all, 'catalogs'] as const,
      categories: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'categories', catalogId] as const,
      tags: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'tags', catalogId] as const,
      parameters: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'parameters', catalogId] as const,
      simpleParameters: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'simple-parameters', catalogId] as const,
      validatorSettings: () => [...QUERY_KEYS.products.settings.all, 'validator-settings'] as const,
      validatorPatterns: () => [...QUERY_KEYS.products.settings.all, 'validator-patterns'] as const,
      validatorConfig: (includeDisabled: boolean) =>
        [...QUERY_KEYS.products.settings.all, 'validator-config', includeDisabled] as const,
      categoryTree: (catalogId?: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'category-tree', catalogId ?? null] as const,
      syncProfiles: () => [...QUERY_KEYS.products.settings.all, 'sync-profiles'] as const,
      syncRuns: (profileId?: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'sync-runs', profileId ?? 'all'] as const,
      syncRunDetail: (runId: string) =>
        [...QUERY_KEYS.products.settings.all, 'sync-run', runId] as const,
    },
  },
  settings: {
    all: ['settings'] as const,
    mutations: () => [...QUERY_KEYS.settings.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.settings.mutations(), name] as const,
    scope: (scope: string) => [...QUERY_KEYS.settings.all, scope] as const,
    composed: () => [...QUERY_KEYS.settings.all, 'composed'] as const,
  },
  kangur: {
    all: ['kangur'] as const,
    lessons: () => [...QUERY_KEYS.kangur.all, 'lessons'] as const,
    lessonsCatalog: () => [...QUERY_KEYS.kangur.all, 'lessons-catalog'] as const,
    gameLibraryPage: () => [...QUERY_KEYS.kangur.all, 'game-library-page'] as const,
    gameContentSets: () => [...QUERY_KEYS.kangur.all, 'game-content-sets'] as const,
    gameInstances: () => [...QUERY_KEYS.kangur.all, 'game-instances'] as const,
    lessonGameSections: () => [...QUERY_KEYS.kangur.all, 'lesson-game-sections'] as const,
    lessonDocuments: () => [...QUERY_KEYS.kangur.all, 'lesson-documents'] as const,
    lessonDocument: (lessonId: string | null, locale?: string | null) =>
      [...QUERY_KEYS.kangur.lessonDocuments(), 'detail', lessonId ?? null, locale ?? null] as const,
    lessonSections: () => [...QUERY_KEYS.kangur.all, 'lesson-sections'] as const,
    lessonTemplates: () => [...QUERY_KEYS.kangur.all, 'lesson-templates'] as const,
    lessonTemplate: (
      componentId: string | null,
      locale?: string | null,
      filters?: { subject?: string | null; ageGroup?: string | null }
    ) =>
      [
        ...QUERY_KEYS.kangur.lessonTemplates(),
        'detail',
        componentId ?? null,
        locale ?? null,
        {
          subject: filters?.subject ?? null,
          ageGroup: filters?.ageGroup ?? null,
        },
      ] as const,
    assignments: (options?: { includeArchived?: boolean | undefined }) =>
      [...QUERY_KEYS.kangur.all, 'assignments', { includeArchived: options?.includeArchived ?? false }] as const,
    socialPosts: (options: {
      scope: string;
      limit?: number | null;
      page?: number | null;
      pageSize?: number | null;
      search?: string | null;
      status?: string | null;
    }) =>
      [...QUERY_KEYS.kangur.all, 'social-posts', options] as const,
    socialPost: (id: string | null) =>
      [...QUERY_KEYS.kangur.all, 'social-post', id ?? null] as const,
    socialImageAddons: (options: { limit: number | null; ids?: string[] | null }) =>
      [...QUERY_KEYS.kangur.all, 'social-image-addons', options] as const,
    observability: {
      all: ['kangur', 'observability'] as const,
      summary: (range: '24h' | '7d' | '30d') =>
        [...QUERY_KEYS.kangur.observability.all, 'summary', { range }] as const,
      knowledgeGraphStatus: (graphKey: string) =>
        [...QUERY_KEYS.kangur.observability.all, 'knowledge-graph-status', { graphKey }] as const,
    },
    aiTutor: {
      all: ['kangur', 'ai-tutor'] as const,
      usage: (learnerId: string | null) =>
        [...QUERY_KEYS.kangur.aiTutor.all, 'usage', { learnerId }] as const,
    },
  },
  notes: {
    all: ['notes'] as const,
    lists: () => [...QUERY_KEYS.notes.all, 'list'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.notes.lists(), { filters }] as const,
    details: () => [...QUERY_KEYS.notes.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.notes.details(), id] as const,
    search: (query: string) => [...QUERY_KEYS.notes.all, 'search', { query }] as const,
    lookup: (ids: string[]) => [...QUERY_KEYS.notes.all, 'lookup', { ids }] as const,
    notebooks: () => [...QUERY_KEYS.notes.all, 'notebooks'] as const,
    tags: (notebookId?: string) => [...QUERY_KEYS.notes.all, 'tags', notebookId ?? 'all'] as const,
    categories: (notebookId?: string | null) =>
      [...QUERY_KEYS.notes.all, 'categories', notebookId ?? 'all'] as const,
    folderTree: (notebookId?: string) =>
      [...QUERY_KEYS.notes.all, 'folder-tree', notebookId ?? 'all'] as const,
    themes: (notebookId?: string) =>
      [...QUERY_KEYS.notes.all, 'themes', notebookId ?? 'all'] as const,
  },
  cms: {
    all: ['cms'] as const,
    mutations: () => [...QUERY_KEYS.cms.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.cms.mutations(), name] as const,
    pages: {
      all: ['cms', 'pages'] as const,
      lists: () => [...QUERY_KEYS.cms.pages.all, 'list'] as const,
      list: (domainId?: string | null) =>
        [...QUERY_KEYS.cms.pages.lists(), domainId ?? 'all'] as const,
      details: () => [...QUERY_KEYS.cms.pages.all, 'detail'] as const,
      detail: (id: string) => [...QUERY_KEYS.cms.pages.details(), id] as const,
    },
    slugs: {
      all: ['cms', 'slugs'] as const,
      lists: () => [...QUERY_KEYS.cms.slugs.all, 'list'] as const,
      list: (domainId?: string | null) =>
        [...QUERY_KEYS.cms.slugs.lists(), domainId ?? 'all'] as const,
      allSlugs: () => [...QUERY_KEYS.cms.slugs.lists(), 'all-slugs'] as const,
      details: () => [...QUERY_KEYS.cms.slugs.all, 'detail'] as const,
      detail: (id: string) => [...QUERY_KEYS.cms.slugs.details(), id] as const,
      detailWithDomain: (id: string, domainId?: string) =>
        [...QUERY_KEYS.cms.slugs.detail(id), { domainId: domainId ?? 'current' }] as const,
      domains: (id: string) => [...QUERY_KEYS.cms.slugs.detail(id), 'domains'] as const,
    },
    domains: {
      all: ['cms', 'domains'] as const,
      lists: () => [...QUERY_KEYS.cms.domains.all, 'list'] as const,
    },
    themes: {
      all: ['cms', 'themes'] as const,
      lists: () => [...QUERY_KEYS.cms.themes.all, 'list'] as const,
      details: () => [...QUERY_KEYS.cms.themes.all, 'detail'] as const,
      detail: (id: string) => [...QUERY_KEYS.cms.themes.details(), id] as const,
    },
    blocks: {
      all: ['cms', 'blocks'] as const,
      lists: () => [...QUERY_KEYS.cms.blocks.all, 'list'] as const,
    },
  },
  integrations: {
    all: ['integrations'] as const,
    lists: () => [...QUERY_KEYS.integrations.all, 'list'] as const,
    connections: (integrationId?: string) =>
      [...QUERY_KEYS.integrations.lists(), 'connections', integrationId ?? 'all'] as const,
    connectionSession: (connectionId?: string) =>
      [...QUERY_KEYS.integrations.all, 'connection-session', connectionId ?? 'all'] as const,
    withConnections: () => [...QUERY_KEYS.integrations.lists(), 'with-connections'] as const,
    marketplaces: () => [...QUERY_KEYS.integrations.lists(), 'marketplaces'] as const,
    exportTemplates: () => [...QUERY_KEYS.integrations.lists(), 'export-templates'] as const,
    activeExportTemplate: () => [...QUERY_KEYS.integrations.all, 'active-export-template'] as const,
    defaultExportInventory: () =>
      [...QUERY_KEYS.integrations.all, 'default-export-inventory'] as const,
    baseInventories: (connectionId?: string) =>
      [...QUERY_KEYS.integrations.all, 'base-inventories', connectionId ?? 'all'] as const,
    productListingsBadges: () =>
      [...QUERY_KEYS.integrations.all, 'product-listings-badges'] as const,
    imageRetryPresets: () => [...QUERY_KEYS.integrations.all, 'image-retry-presets'] as const,
    selection: {
      defaultConnection: () =>
        [...QUERY_KEYS.integrations.all, 'base', 'default-connection'] as const,
      traderaDefaultConnection: () =>
        [...QUERY_KEYS.integrations.all, 'tradera', 'default-connection'] as const,
      withConnections: () => QUERY_KEYS.integrations.withConnections(),
    },
    marketplace: {
      all: ['marketplace'] as const,
      lists: () => [...QUERY_KEYS.integrations.marketplace.all, 'list'] as const,
      mutations: () => [...QUERY_KEYS.integrations.marketplace.all, 'mutation'] as const,
      mutation: (name: string) =>
        [...QUERY_KEYS.integrations.marketplace.mutations(), name] as const,
      categories: (connectionId: string) =>
        [...QUERY_KEYS.integrations.marketplace.lists(), 'categories', connectionId] as const,
      mappings: (connectionId: string, catalogId?: string | null) =>
        [
          ...QUERY_KEYS.integrations.marketplace.lists(),
          'mappings',
          connectionId,
          catalogId ?? 'all',
        ] as const,
      producers: (connectionId: string) =>
        [...QUERY_KEYS.integrations.marketplace.lists(), 'producers', connectionId] as const,
      producerMappings: (connectionId: string) =>
        [
          ...QUERY_KEYS.integrations.marketplace.lists(),
          'producer-mappings',
          connectionId,
        ] as const,
      tags: (connectionId: string) =>
        [...QUERY_KEYS.integrations.marketplace.lists(), 'tags', connectionId] as const,
      tagMappings: (connectionId: string) =>
        [...QUERY_KEYS.integrations.marketplace.lists(), 'tag-mappings', connectionId] as const,
    },
    listings: (id: string) => [...QUERY_KEYS.integrations.all, 'listings', id] as const,
    importExport: {
      all: ['import-export'] as const,
      lists: () => [...QUERY_KEYS.integrations.importExport.all, 'list'] as const,
      templates: (scope: 'import' | 'export') =>
        [...QUERY_KEYS.integrations.importExport.lists(), 'templates', scope] as const,
      preferences: () => [...QUERY_KEYS.integrations.importExport.all, 'preferences'] as const,
      pref: (key: string) => [...QUERY_KEYS.integrations.importExport.preferences(), key] as const,
      inventories: (connectionId?: string) =>
        [...QUERY_KEYS.integrations.importExport.lists(), 'inventories', { connectionId }] as const,
      warehouses: (inventoryId: string, connectionId?: string, includeAll?: boolean) =>
        [
          ...QUERY_KEYS.integrations.importExport.lists(),
          'warehouses',
          { inventoryId, connectionId, includeAll },
        ] as const,
      parameters: (inventoryId: string, productId: string) =>
        [
          ...QUERY_KEYS.integrations.importExport.lists(),
          'parameters',
          { inventoryId, productId },
        ] as const,
      importList: (inventoryId: string, params: Record<string, unknown>) =>
        [
          ...QUERY_KEYS.integrations.importExport.lists(),
          'import-list',
          { inventoryId, ...params },
        ] as const,
      runs: () => [...QUERY_KEYS.integrations.importExport.all, 'runs'] as const,
      run: (runId: string) => [...QUERY_KEYS.integrations.importExport.runs(), runId] as const,
    },
  },
  ai: {
    all: ['ai'] as const,
    chatbot: {
      all: ['ai', 'chatbot'] as const,
      lists: () => [...QUERY_KEYS.ai.chatbot.all, 'list'] as const,
      mutations: () => [...QUERY_KEYS.ai.chatbot.all, 'mutation'] as const,
      mutation: (name: string) => [...QUERY_KEYS.ai.chatbot.mutations(), name] as const,
      sessions: () => [...QUERY_KEYS.ai.chatbot.lists(), 'sessions'] as const,
      sessionIds: (query?: string) =>
        [...QUERY_KEYS.ai.chatbot.sessions(), 'ids', query ?? 'all'] as const,
      details: () => [...QUERY_KEYS.ai.chatbot.all, 'detail'] as const,
      session: (id: string) => [...QUERY_KEYS.ai.chatbot.details(), id] as const,
      memory: (query?: string) => [...QUERY_KEYS.ai.chatbot.all, 'memory', query ?? 'all'] as const,
      context: () => [...QUERY_KEYS.ai.chatbot.all, 'context'] as const,
      settings: {
        all: (key?: string) =>
          [...QUERY_KEYS.ai.chatbot.all, 'settings', key ?? 'default'] as const,
        allSettings: (key?: string) =>
          [...QUERY_KEYS.ai.chatbot.settings.all(key), 'all-settings'] as const,
      },
      models: () => [...QUERY_KEYS.ai.chatbot.all, 'models'] as const,
      caseResolverOcrModels: () =>
        [...QUERY_KEYS.ai.chatbot.models(), 'case-resolver-ocr'] as const,
    },
    aiPaths: {
      all: ['ai', 'ai-paths'] as const,
      lists: () => [...QUERY_KEYS.ai.aiPaths.all, 'list'] as const,
      mutations: () => [...QUERY_KEYS.ai.aiPaths.all, 'mutation'] as const,
      mutation: (name: string) => [...QUERY_KEYS.ai.aiPaths.mutations(), name] as const,
      settings: () => [...QUERY_KEYS.ai.aiPaths.all, 'settings'] as const,
      triggerButtons: () => [...QUERY_KEYS.ai.aiPaths.all, 'trigger-buttons'] as const,
      runs: (filters?: unknown) =>
        [...QUERY_KEYS.ai.aiPaths.lists(), 'runs', filters ? { filters } : 'all'] as const,
      details: () => [...QUERY_KEYS.ai.aiPaths.all, 'detail'] as const,
      run: (id: string) => [...QUERY_KEYS.ai.aiPaths.details(), id] as const,
      deadLetter: (filters: unknown) =>
        [...QUERY_KEYS.ai.aiPaths.lists(), 'dead-letter', filters] as const,
      runtimeAnalytics: (range: string) =>
        [...QUERY_KEYS.ai.aiPaths.all, 'runtime-analytics', { range }] as const,
      jobQueue: (filters: unknown) =>
        [...QUERY_KEYS.ai.aiPaths.lists(), 'job-queue', { filters }] as const,
      queueStatus: (filters?: unknown) =>
        [...QUERY_KEYS.ai.aiPaths.all, 'queue-status', filters ? { filters } : 'all'] as const,
    },
    insights: {
      all: ['ai', 'insights'] as const,
      lists: () => [...QUERY_KEYS.ai.insights.all, 'list'] as const,
      analytics: () => [...QUERY_KEYS.ai.insights.lists(), 'analytics'] as const,
      runtimeAnalytics: () => [...QUERY_KEYS.ai.insights.lists(), 'runtime-analytics'] as const,
      logs: () => [...QUERY_KEYS.ai.insights.lists(), 'logs'] as const,
      notifications: () => [...QUERY_KEYS.ai.insights.lists(), 'notifications'] as const,
    },
    agentTeaching: {
      all: ['ai', 'agent-teaching'] as const,
      lists: () => [...QUERY_KEYS.ai.agentTeaching.all, 'list'] as const,
      agents: () => [...QUERY_KEYS.ai.agentTeaching.lists(), 'agents'] as const,
      collections: () => [...QUERY_KEYS.ai.agentTeaching.lists(), 'collections'] as const,
      details: () => [...QUERY_KEYS.ai.agentTeaching.all, 'detail'] as const,
      documents: (collectionId: string) =>
        [
          ...QUERY_KEYS.ai.agentTeaching.details(),
          'collections',
          collectionId,
          'documents',
        ] as const,
    },
    contextRegistry: {
      all: ['ai', 'context-registry'] as const,
      search: (query: string, kind: string) =>
        [...QUERY_KEYS.ai.contextRegistry.all, 'search', { query, kind }] as const,
      related: (id: string | null) =>
        [...QUERY_KEYS.ai.contextRegistry.all, 'related', id ?? 'none'] as const,
      schema: (entity: string | null) =>
        [...QUERY_KEYS.ai.contextRegistry.all, 'schema', entity ?? 'none'] as const,
      bundle: (signature: string) =>
        [...QUERY_KEYS.ai.contextRegistry.all, 'bundle', signature] as const,
    },
  },
  userPreferences: {
    all: ['user-preferences'] as const,
    mutations: () => [...QUERY_KEYS.userPreferences.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.userPreferences.mutations(), name] as const,
  },
  auth: {
    all: ['auth'] as const,
    mutations: () => [...QUERY_KEYS.auth.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.auth.mutations(), name] as const,
    user: () => [...QUERY_KEYS.auth.all, 'user'] as const,
    session: () => [...QUERY_KEYS.auth.all, 'session'] as const,
    users: {
      all: ['auth', 'users'] as const,
      lists: () => [...QUERY_KEYS.auth.users.all, 'list'] as const,
      details: () => [...QUERY_KEYS.auth.users.all, 'detail'] as const,
      detail: (id: string) => [...QUERY_KEYS.auth.users.details(), id] as const,
      security: (id: string) => [...QUERY_KEYS.auth.users.detail(id), 'security'] as const,
    },
    preferences: {
      all: ['auth', 'preferences'] as const,
      lists: () => [...QUERY_KEYS.auth.preferences.all, 'list'] as const,
      detail: (key: string) => [...QUERY_KEYS.auth.preferences.all, 'item', key] as const,
    },
  },
  system: {
    all: ['system'] as const,
    logs: {
      all: ['system', 'logs'] as const,
      lists: () => [...QUERY_KEYS.system.logs.all, 'list'] as const,
      list: (filters: unknown) => [...QUERY_KEYS.system.logs.lists(), filters] as const,
      metrics: (filters: unknown) => [...QUERY_KEYS.system.logs.all, 'metrics', filters] as const,
      insights: (limit?: number) => [...QUERY_KEYS.system.logs.all, 'insights', { limit }] as const,
    },
    uploadEvents: {
      all: ['system', 'upload-events'] as const,
      lists: () => [...QUERY_KEYS.system.uploadEvents.all, 'list'] as const,
      list: (filters: unknown) => [...QUERY_KEYS.system.uploadEvents.lists(), filters] as const,
    },
    diagnostics: {
      all: ['system', 'diagnostics'] as const,
      mongo: () => [...QUERY_KEYS.system.diagnostics.all, 'mongo'] as const,
    },
    activity: {
      all: ['system', 'activity'] as const,
      lists: () => [...QUERY_KEYS.system.activity.all, 'list'] as const,
      list: (filters: unknown) => [...QUERY_KEYS.system.activity.lists(), filters] as const,
    },
    databases: {
      all: ['system', 'databases'] as const,
      lists: () => [...QUERY_KEYS.system.databases.all, 'list'] as const,
      backups: (dbType: string) =>
        [...QUERY_KEYS.system.databases.lists(), 'backups', dbType] as const,
      providerDiagnostics: () =>
        [...QUERY_KEYS.system.databases.all, 'provider-diagnostics'] as const,
      preview: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'preview', params] as const,
      crudRows: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'crud-rows', params] as const,
      schema: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'schema', params] as const,
      redisOverview: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'redis-overview', params] as const,
      engineStatus: () => [...QUERY_KEYS.system.databases.all, 'engine-status'] as const,
      engineBackupSchedulerStatus: () =>
        [...QUERY_KEYS.system.databases.all, 'engine-backup-scheduler-status'] as const,
      engineOperationsJobs: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'engine-operations-jobs', params] as const,
      engineProviderPreview: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'engine-provider-preview', params] as const,
      controlPanel: () => [...QUERY_KEYS.system.databases.all, 'control-panel'] as const,
      jsonBackups: () => [...QUERY_KEYS.system.databases.all, 'json-backups'] as const,
    },
  },
  internationalization: {
    all: ['internationalization'] as const,
    currencies: () => [...QUERY_KEYS.internationalization.all, 'currencies'] as const,
    countries: () => [...QUERY_KEYS.internationalization.all, 'countries'] as const,
    languages: () => [...QUERY_KEYS.internationalization.all, 'languages'] as const,
  },
  drafts: {
    all: ['drafts'] as const,
    lists: () => [...QUERY_KEYS.drafts.all, 'list'] as const,
    details: () => [...QUERY_KEYS.drafts.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.drafts.details(), id] as const,
  },
  drafter: {
    all: ['drafter'] as const,
    lists: () => [...QUERY_KEYS.drafter.all, 'list'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.drafter.lists(), { filters }] as const,
    details: () => [...QUERY_KEYS.drafter.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.drafter.details(), id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (range: string, scope: string) =>
      [...QUERY_KEYS.analytics.all, 'summary', range, scope] as const,
    events: (filters: {
      page: number;
      pageSize: number;
      range: string;
      scope: string;
      type: string;
      search: string;
      country: string;
      referrerHost: string;
      browser: string;
      device: string;
      bot: string;
    }) => [...QUERY_KEYS.analytics.all, 'events', { filters }] as const,
    insights: (limit?: number) => [...QUERY_KEYS.analytics.all, 'insights', { limit }] as const,
  },
  playwright: {
    all: ['playwright'] as const,
    lists: () => [...QUERY_KEYS.playwright.all, 'list'] as const,
    personas: () => [...QUERY_KEYS.playwright.lists(), 'personas'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...QUERY_KEYS.jobs.all, 'list'] as const,
    integrations: () => [...QUERY_KEYS.jobs.lists(), 'integrations'] as const,
    traderaQueueHealth: () => [...QUERY_KEYS.jobs.integrations(), 'tradera-queue-health'] as const,
    productAi: (scope: string) => [...QUERY_KEYS.jobs.lists(), 'product-ai', scope] as const,
    chatbot: (scope: string) => [...QUERY_KEYS.jobs.lists(), 'chatbot', scope] as const,
    realtime: () => [...QUERY_KEYS.jobs.lists(), 'realtime'] as const,
    details: () => [...QUERY_KEYS.jobs.all, 'detail'] as const,
    status: (id: string) => [...QUERY_KEYS.jobs.details(), id] as const,
  },
  imageStudio: {
    all: ['image-studio'] as const,
    lists: () => [...QUERY_KEYS.imageStudio.all, 'list'] as const,
    mutations: () => [...QUERY_KEYS.imageStudio.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.imageStudio.mutations(), name] as const,
    projects: () => [...QUERY_KEYS.imageStudio.lists(), 'projects'] as const,
    slots: (projectId: string) => [...QUERY_KEYS.imageStudio.lists(), 'slots', projectId] as const,
    models: () => [...QUERY_KEYS.imageStudio.all, 'models'] as const,
    runs: (filters: unknown) => [...QUERY_KEYS.imageStudio.lists(), 'runs', { filters }] as const,
    details: () => [...QUERY_KEYS.imageStudio.all, 'detail'] as const,
    run: (id: string) => [...QUERY_KEYS.imageStudio.details(), id] as const,
  },
  agentRuns: {
    all: ['agent-runs'] as const,
    lists: () => [...QUERY_KEYS.agentRuns.all, 'list'] as const,
    details: () => [...QUERY_KEYS.agentRuns.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.agentRuns.details(), id] as const,
    snapshots: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'snapshots'] as const,
    logs: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'logs'] as const,
    audits: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'audits'] as const,
  },
  agentPersonas: {
    all: ['agent-personas'] as const,
    lists: () => [...QUERY_KEYS.agentPersonas.all, 'list'] as const,
    details: () => [...QUERY_KEYS.agentPersonas.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.agentPersonas.details(), id] as const,
    memory: (id: string, filters: unknown) =>
      [...QUERY_KEYS.agentPersonas.detail(id), 'memory', { filters }] as const,
    mutations: () => [...QUERY_KEYS.agentPersonas.all, 'mutation'] as const,
    mutation: (name: string) => [...QUERY_KEYS.agentPersonas.mutations(), name] as const,
  },
  brain: {
    all: ['brain'] as const,
    lists: () => [...QUERY_KEYS.brain.all, 'list'] as const,
    models: () => [...QUERY_KEYS.brain.lists(), 'models'] as const,
    operationsOverview: (range: string = '1h') =>
      [...QUERY_KEYS.brain.all, 'operations-overview', range] as const,
    metrics: () => [...QUERY_KEYS.brain.all, 'metrics'] as const,
    analyticsSummary: () => [...QUERY_KEYS.brain.metrics(), 'analytics-summary'] as const,
    logMetrics: () => [...QUERY_KEYS.brain.metrics(), 'logs'] as const,
    insights: () => [...QUERY_KEYS.brain.metrics(), 'insights'] as const,
    runtimeAnalytics: () => [...QUERY_KEYS.brain.metrics(), 'runtime-analytics'] as const,
  },
  viewer3d: {
    all: ['assets3d'] as const,
    lists: () => [...QUERY_KEYS.viewer3d.all, 'list'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.viewer3d.lists(), { filters }] as const,
    details: () => [...QUERY_KEYS.viewer3d.all, 'detail'] as const,
    detail: (id: string | null) => [...QUERY_KEYS.viewer3d.details(), id] as const,
    categories: () => [...QUERY_KEYS.viewer3d.all, 'categories'] as const,
    tags: () => [...QUERY_KEYS.viewer3d.all, 'tags'] as const,
  },
  search: {
    all: ['search'] as const,
    term: (searchTerm: string) => [...QUERY_KEYS.search.all, searchTerm] as const,
    paginated: (searchTerm: string, pageSize: number) =>
      [...QUERY_KEYS.search.all, 'paginated', searchTerm, pageSize] as const,
    suggestions: (searchTerm: string) =>
      [...QUERY_KEYS.search.all, 'suggestions', searchTerm] as const,
  },
  files: {
    all: ['files'] as const,
    lists: () => [...QUERY_KEYS.files.all, 'list'] as const,
    list: (params: string) => [...QUERY_KEYS.files.lists(), params] as const,
  },
  resources: {
    all: ['resources'] as const,
    mutations: (resource: string) => [...QUERY_KEYS.resources.all, resource, 'mutation'] as const,
    mutation: (resource: string, action: string) =>
      [...QUERY_KEYS.resources.mutations(resource), action] as const,
  },
  navigation: {
    all: ['navigation'] as const,
    route: (path: string) => [...QUERY_KEYS.navigation.all, path] as const,
  },
  user: {
    all: ['user'] as const,
    preferences: (userId: string) => [...QUERY_KEYS.user.all, 'preferences', userId] as const,
    settings: (userId: string) => [...QUERY_KEYS.user.all, 'settings', userId] as const,
  },
  health: {
    all: ['health'] as const,
    status: () => [...QUERY_KEYS.health.all, 'status'] as const,
  },
} as const;
