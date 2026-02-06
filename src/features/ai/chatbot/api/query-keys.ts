export const chatbotQueryKeys = {
  all: ['chatbot'] as const,
  sessions: () => [...chatbotQueryKeys.all, 'sessions'] as const,
  session: (sessionId: string) =>
    [...chatbotQueryKeys.sessions(), sessionId] as const,
  memory: (query?: string) =>
    [...chatbotQueryKeys.all, 'memory', query ?? 'all'] as const,
  context: () => [...chatbotQueryKeys.all, 'context'] as const,
  settings: (key?: string) =>
    [...chatbotQueryKeys.all, 'settings', key ?? 'default'] as const,
  models: () => [...chatbotQueryKeys.all, 'models'] as const,
};
