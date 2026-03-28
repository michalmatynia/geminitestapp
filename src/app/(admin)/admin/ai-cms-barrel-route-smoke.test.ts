import { describe, expect, it } from 'vitest';

const adminAiRouteImports = [
  './ai-paths/page',
  './ai-paths/queue/page',
  './ai-paths/trigger-buttons/page',
  './ai-paths/validation/page',
  './ai-paths/dead-letter/page',
  './ai-insights/page',
  './agentcreator/runs/page',
  './agentcreator/personas/page',
  './agentcreator/personas/[personaId]/memory/page',
  './agentcreator/teaching/layout',
  './agentcreator/teaching/agents/page',
  './agentcreator/teaching/chat/page',
  './agentcreator/teaching/collections/page',
  './agentcreator/teaching/collections/[collectionId]/page',
  './chatbot/page',
  './chatbot/sessions/page',
  './chatbot/memory/page',
  './chatbot/context/page',
  './context-registry/page',
  './image-studio/page',
  './image-studio/ui-presets/page',
] as const;

const adminCmsRouteImports = [
  './cms/page',
  './cms/builder/page',
  './cms/builder/settings/page',
  './cms/pages/page',
  './cms/pages/create/page',
  './cms/pages/[id]/edit/page',
  './cms/pages/[id]/edit/layout',
  './cms/slugs/page',
  './cms/slugs/create/page',
  './cms/slugs/[id]/edit/page',
  './cms/themes/page',
  './cms/themes/create/page',
  './cms/themes/[id]/edit/page',
  './cms/zones/page',
] as const;

describe('admin ai, agentcreator, image studio, and cms route barrels', () => {
  it.each(adminAiRouteImports)(
    'loads %s without missing barrel exports',
    async (path) => {
      const routeModule = await import(path);

      expect(routeModule.default).toBeTypeOf('function');
    },
    120000
  );

  it.each(adminCmsRouteImports)(
    'loads %s without missing barrel exports',
    async (path) => {
      const routeModule = await import(path);

      expect(routeModule.default).toBeTypeOf('function');
    },
    120000
  );
});
