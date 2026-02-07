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
    list: (filters: any) => [...QUERY_KEYS.products.lists(), { filters }] as const,
    counts: () => [...QUERY_KEYS.products.all, 'count'] as const,
    count: (filters: any) => [...QUERY_KEYS.products.counts(), { filters }] as const,
    details: () => [...QUERY_KEYS.products.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.products.details(), id] as const,
    aiJobs: {
      all: ['products', 'ai-jobs'] as const,
      detail: (id: string) => [...QUERY_KEYS.products.aiJobs.all, id] as const,
    }
  },
  settings: {
    all: ['settings'] as const,
    scope: (scope: string) => [...QUERY_KEYS.settings.all, scope] as const,
  },
  notes: {
    all: ['notes'] as const,
    lists: () => [...QUERY_KEYS.notes.all, 'list'] as const,
    list: (filters: any) => [...QUERY_KEYS.notes.lists(), { filters }] as const,
    detail: (id: string) => [...QUERY_KEYS.notes.all, 'detail', id] as const,
    notebooks: ['notebooks'] as const,
    tags: ['tags'] as const,
    categories: ['categories'] as const,
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
    marketplaces: () => [...QUERY_KEYS.integrations.all, 'marketplaces'] as const,
    listings: (id: string) => [...QUERY_KEYS.integrations.all, 'listings', id] as const,
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
      runs: () => [...QUERY_KEYS.ai.aiPaths.all, 'runs'] as const,
    }
  },
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
    preferences: ['auth', 'preferences'] as const,
  },
  system: {
    logs: ['system', 'logs'] as const,
    diagnostics: ['system', 'diagnostics'] as const,
    databases: {
      all: ['system', 'databases'] as const,
      backups: (dbType: string) => [...QUERY_KEYS.system.databases.all, 'backups', dbType] as const,
      preview: (params: any) => [...QUERY_KEYS.system.databases.all, 'preview', params] as const,
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
  }
} as const;
