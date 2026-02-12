/**
 * Centralized Query Keys Factory for TanStack Query
 * 
 * Follows the pattern:
 * - all: base key
 * - lists: key for lists
 * - list: key for a specific list with filters
 * - details: key for all details
 * - detail: key for a specific detail by id
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
    aiJobs: {
      all: ['products', 'ai-jobs'] as const,
      detail: (id: string) => [...QUERY_KEYS.products.aiJobs.all, id] as const,
    },
    catalogs: ['catalogs'] as const,
    metadata: {
      catalogs: ['catalogs'] as const,
      categories: (catalogId: string) => ['categories', catalogId] as const,
      tags: (catalogId: string) => ['tags', catalogId] as const,
      producers: ['producers'] as const,
      parameters: (catalogId: string) => ['parameters', catalogId] as const,
      languages: ['languages'] as const,
      priceGroups: ['price-groups'] as const,
    },
    settings: {
      all: ['product-settings'] as const,
      priceGroups: () => [...QUERY_KEYS.products.settings.all, 'price-groups'] as const,
      catalogs: () => [...QUERY_KEYS.products.settings.all, 'catalogs'] as const,
      categories: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'categories', catalogId] as const,
      tags: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'tags', catalogId] as const,
      parameters: (catalogId: string | null) =>
        [...QUERY_KEYS.products.settings.all, 'parameters', catalogId] as const,
      validatorSettings: () =>
        [...QUERY_KEYS.products.settings.all, 'validator-settings'] as const,
      validatorPatterns: () =>
        [...QUERY_KEYS.products.settings.all, 'validator-patterns'] as const,
      validatorConfig: (includeDisabled: boolean) =>
        [...QUERY_KEYS.products.settings.all, 'validator-config', includeDisabled] as const,
      categoryTree: (catalogId?: string) =>
        ['product-categories', 'tree', catalogId] as const,
    },
  },
  settings: {
    all: ['settings'] as const,
    scope: (scope: string) => [...QUERY_KEYS.settings.all, scope] as const,
  },
  notes: {
    all: ['notes'] as const,
    lists: () => [...QUERY_KEYS.notes.all, 'list'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.notes.lists(), { filters }] as const,
    detail: (id: string) => [...QUERY_KEYS.notes.all, 'detail', id] as const,
    search: (query: string) => [...QUERY_KEYS.notes.all, 'search', { query }] as const,
    lookup: (ids: string[]) => [...QUERY_KEYS.notes.all, 'lookup', { ids }] as const,
    notebooks: ['notes', 'notebooks'] as const,
    tags: ['notes', 'tags'] as const,
    categories: ['notes', 'categories'] as const,
    folderTree: (notebookId?: string) => [...QUERY_KEYS.notes.all, 'folder-tree', notebookId] as const,
    themes: (notebookId?: string) => [...QUERY_KEYS.notes.all, 'themes', notebookId] as const,
  },
  cms: {
    all: ['cms'] as const,
    pages: {
      all: ['cms', 'pages'] as const,
      list: (domainId?: string | null) => [...QUERY_KEYS.cms.pages.all, domainId ?? 'all'] as const,
      detail: (id: string) => ['cms', 'page', id] as const,
    },
    slugs: {
      all: ['cms', 'slugs'] as const,
      list: (domainId?: string | null) => [...QUERY_KEYS.cms.slugs.all, domainId ?? 'all'] as const,
      detail: (id: string) => ['cms', 'slug', id] as const,
      domains: (id: string) => ['cms', 'slug-domains', id] as const,
    },
    domains: {
      all: ['cms', 'domains'] as const,
    },
    themes: {
      all: ['cms', 'themes'] as const,
      detail: (id: string) => ['cms', 'theme', id] as const,
    },
    blocks: () => [...QUERY_KEYS.cms.all, 'blocks'] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    connections: () => [...QUERY_KEYS.integrations.all, 'connections'] as const,
    withConnections: () => [...QUERY_KEYS.integrations.all, 'with-connections'] as const,
    marketplaces: () => [...QUERY_KEYS.integrations.all, 'marketplaces'] as const,
    selection: {
      defaultConnection: () =>
        [...QUERY_KEYS.integrations.all, 'base', 'default-connection'] as const,
      withConnections: () =>
        [...QUERY_KEYS.integrations.withConnections(), 'selector-v2'] as const,
    },
    marketplace: {
      all: ['marketplace'] as const,
      categories: (connectionId: string) => [...QUERY_KEYS.integrations.marketplace.all, 'categories', connectionId] as const,
      mappings: (connectionId: string, catalogId?: string | null) => [...QUERY_KEYS.integrations.marketplace.all, 'mappings', connectionId, catalogId ?? 'all'] as const,
      producers: (connectionId: string) => [...QUERY_KEYS.integrations.marketplace.all, 'producers', connectionId] as const,
      producerMappings: (connectionId: string) => [...QUERY_KEYS.integrations.marketplace.all, 'producer-mappings', connectionId] as const,
      tags: (connectionId: string) => [...QUERY_KEYS.integrations.marketplace.all, 'tags', connectionId] as const,
      tagMappings: (connectionId: string) => [...QUERY_KEYS.integrations.marketplace.all, 'tag-mappings', connectionId] as const,
    },
    listings: (id: string) => [...QUERY_KEYS.integrations.all, 'listings', id] as const,
    importExport: {
      all: ['import-export'] as const,
      templates: (scope: 'import' | 'export') => [...QUERY_KEYS.integrations.importExport.all, 'templates', scope] as const,
      preferences: () => [...QUERY_KEYS.integrations.importExport.all, 'preferences'] as const,
      pref: (key: string) => [...QUERY_KEYS.integrations.importExport.preferences(), key] as const,
      inventories: (connectionId?: string) => [...QUERY_KEYS.integrations.importExport.all, 'inventories', { connectionId }] as const,
      warehouses: (inventoryId: string, connectionId?: string, includeAll?: boolean) => 
        [...QUERY_KEYS.integrations.importExport.all, 'warehouses', { inventoryId, connectionId, includeAll }] as const,
      parameters: (inventoryId: string, productId: string) => 
        [...QUERY_KEYS.integrations.importExport.all, 'parameters', { inventoryId, productId }] as const,
      importList: (inventoryId: string, params: Record<string, unknown>) =>
        [...QUERY_KEYS.integrations.importExport.all, 'import-list', { inventoryId, ...params }] as const,
    }
  },
  ai: {
    all: ['ai'] as const,
    chatbot: {
      all: ['chatbot'] as const,
      sessions: () => [...QUERY_KEYS.ai.chatbot.all, 'sessions'] as const,
      session: (id: string) => [...QUERY_KEYS.ai.chatbot.sessions(), id] as const,
      memory: (query?: string) => [...QUERY_KEYS.ai.chatbot.all, 'memory', query ?? 'all'] as const,
      context: () => [...QUERY_KEYS.ai.chatbot.all, 'context'] as const,
      settings: (key?: string) => [...QUERY_KEYS.ai.chatbot.all, 'settings', key ?? 'default'] as const,
      models: () => [...QUERY_KEYS.ai.chatbot.all, 'models'] as const,
    },
    aiPaths: {
      all: ['ai', 'ai-paths'] as const,
      settings: () => [...QUERY_KEYS.ai.aiPaths.all, 'settings'] as const,
      triggerButtons: () => [...QUERY_KEYS.ai.aiPaths.all, 'trigger-buttons'] as const,
      runs: () => [...QUERY_KEYS.ai.aiPaths.all, 'runs'] as const,
      run: (id: string) => [...QUERY_KEYS.ai.aiPaths.runs(), id] as const,
      deadLetter: (filters: unknown) => [...QUERY_KEYS.ai.aiPaths.all, 'dead-letter', filters] as const,
      runtimeAnalytics: (range: string) => [...QUERY_KEYS.ai.aiPaths.all, 'runtime-analytics', { range }] as const,
    },
    insights: {
      all: ['ai', 'insights'] as const,
      analytics: () => [...QUERY_KEYS.ai.insights.all, 'analytics'] as const,
      logs: () => [...QUERY_KEYS.ai.insights.all, 'logs'] as const,
    }
  },
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
    users: {
      all: ['auth', 'users'] as const,
      detail: (id: string) => [...QUERY_KEYS.auth.users.all, 'detail', id] as const,
      security: (id: string) => [...QUERY_KEYS.auth.users.all, 'security', id] as const,
    },
    preferences: {
      all: ['auth', 'preferences'] as const,
      detail: (key: string) => [...QUERY_KEYS.auth.preferences.all, key] as const,
    },
  },
  system: {
    logs: {
      all: ['system', 'logs'] as const,
      list: (filters: unknown) => [...QUERY_KEYS.system.logs.all, 'list', filters] as const,
      metrics: (filters: unknown) => [...QUERY_KEYS.system.logs.all, 'metrics', filters] as const,
      insights: (limit?: number) => [...QUERY_KEYS.system.logs.all, 'insights', { limit }] as const,
    },
    diagnostics: {
      all: ['system', 'diagnostics'] as const,
      mongo: ['system', 'diagnostics', 'mongo'] as const,
    },
    activity: {
      all: ['system', 'activity'] as const,
      list: (filters: unknown) => [...QUERY_KEYS.system.activity.all, 'list', filters] as const,
    },
    databases: {
      all: ['system', 'databases'] as const,
      backups: (dbType: string) => [...QUERY_KEYS.system.databases.all, 'backups', dbType] as const,
      providerDiagnostics: ['system', 'databases', 'provider-diagnostics'] as const,
      preview: (params: Record<string, unknown>) => [...QUERY_KEYS.system.databases.all, 'preview', params] as const,
      crudRows: (params: Record<string, unknown>) => [...QUERY_KEYS.system.databases.all, 'crud-rows', params] as const,
      schema: (params: Record<string, unknown>) => [...QUERY_KEYS.system.databases.all, 'schema', params] as const,
      redisOverview: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'redis-overview', params] as const,
      engineStatus: [...['system', 'databases'], 'engine-status'] as const,
      engineBackupSchedulerStatus: [...['system', 'databases'], 'engine-backup-scheduler-status'] as const,
      engineOperationsJobs: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'engine-operations-jobs', params] as const,
      engineProviderPreview: (params: Record<string, unknown>) =>
        [...QUERY_KEYS.system.databases.all, 'engine-provider-preview', params] as const,
      controlPanel: [...['system', 'databases'], 'control-panel'] as const,
      jsonBackups: [...['system', 'databases'], 'json-backups'] as const,
    },
  },
  internationalization: {
    currencies: ['currencies'] as const,
    countries: ['countries'] as const,
    languages: ['languages'] as const,
  },
  drafts: {
    all: ['drafts'] as const,
    detail: (id: string) => ['drafts', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (range: string, scope: string) =>
      [...QUERY_KEYS.analytics.all, 'summary', range, scope] as const,
    insights: (limit?: number) =>
      [...QUERY_KEYS.analytics.all, 'insights', { limit }] as const,
  },
  playwright: {
    all: ['playwright'] as const,
    personas: () => [...QUERY_KEYS.playwright.all, 'personas'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    integrations: () => [...QUERY_KEYS.jobs.all, 'integrations'] as const,
    productAi: (scope: string) => [...QUERY_KEYS.jobs.all, 'product-ai', scope] as const,
    chatbot: (scope: string) => [...QUERY_KEYS.jobs.all, 'chatbot', scope] as const,
    realtime: () => [...QUERY_KEYS.jobs.all, 'realtime'] as const,
    status: (id: string) => [...QUERY_KEYS.jobs.all, 'status', id] as const,
  },
  imageStudio: {
    all: ['image-studio'] as const,
    projects: () => [...QUERY_KEYS.imageStudio.all, 'projects'] as const,
    slots: (projectId: string) => [...QUERY_KEYS.imageStudio.all, 'slots', projectId] as const,
    models: () => [...QUERY_KEYS.imageStudio.all, 'models'] as const,
  },
  agentRuns: {
    all: ['agent-runs'] as const,
    lists: () => [...QUERY_KEYS.agentRuns.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.agentRuns.all, 'detail', id] as const,
    snapshots: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'snapshots'] as const,
    logs: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'logs'] as const,
    audits: (id: string) => [...QUERY_KEYS.agentRuns.detail(id), 'audits'] as const,
  },
  agentPersonas: {
    all: ['agent-personas'] as const,
    list: () => [...QUERY_KEYS.agentPersonas.all, 'list'] as const,
  },
  agentTeaching: {
    all: ['agent-teaching'] as const,
    agents: () => [...QUERY_KEYS.agentTeaching.all, 'agents'] as const,
    collections: () => [...QUERY_KEYS.agentTeaching.all, 'collections'] as const,
    documents: (collectionId: string) =>
      [...QUERY_KEYS.agentTeaching.all, 'collections', collectionId, 'documents'] as const,
  },
  brain: {
    all: ['brain'] as const,
    ollamaModels: () => [...QUERY_KEYS.brain.all, 'ollama-models'] as const,
    metrics: () => [...QUERY_KEYS.brain.all, 'metrics'] as const,
    analyticsSummary: () => [...QUERY_KEYS.brain.metrics(), 'analytics-summary'] as const,
    logMetrics: () => [...QUERY_KEYS.brain.metrics(), 'logs'] as const,
    insights: () => [...QUERY_KEYS.brain.metrics(), 'insights'] as const,
    runtimeAnalytics: () => [...QUERY_KEYS.brain.metrics(), 'runtime-analytics'] as const,
  },
  viewer3d: {
    all: ['assets3d'] as const,
    list: (filters: unknown) => [...QUERY_KEYS.viewer3d.all, 'list', filters] as const,
    detail: (id: string | null) => [...QUERY_KEYS.viewer3d.all, 'detail', id] as const,
    categories: ['assets3d', 'categories'] as const,
    tags: ['assets3d', 'tags'] as const,
  },
  files: {
    all: ['files'] as const,
    list: (params: string) => [...QUERY_KEYS.files.all, 'list', params] as const,
  }
} as const;
