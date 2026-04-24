import { describe, expect, it } from 'vitest';

const adminAiRouteImports = [
  '@/app/(admin)/admin/ai-paths/page',
  '@/app/(admin)/admin/ai-paths/queue/page',
  '@/app/(admin)/admin/ai-paths/trigger-buttons/page',
  '@/app/(admin)/admin/ai-paths/validation/page',
  '@/app/(admin)/admin/ai-insights/page',
  '@/app/(admin)/admin/agentcreator/runs/page',
  '@/app/(admin)/admin/agentcreator/personas/page',
  '@/app/(admin)/admin/agentcreator/personas/[personaId]/memory/page',
  '@/app/(admin)/admin/agentcreator/teaching/layout',
  '@/app/(admin)/admin/agentcreator/teaching/agents/page',
  '@/app/(admin)/admin/agentcreator/teaching/chat/page',
  '@/app/(admin)/admin/agentcreator/teaching/collections/page',
  '@/app/(admin)/admin/agentcreator/teaching/collections/[collectionId]/page',
  '@/app/(admin)/admin/chatbot/page',
  '@/app/(admin)/admin/chatbot/sessions/page',
  '@/app/(admin)/admin/chatbot/memory/page',
  '@/app/(admin)/admin/chatbot/context/page',
  '@/app/(admin)/admin/context-registry/page',
  '@/app/(admin)/admin/image-studio/page',
  '@/app/(admin)/admin/image-studio/ui-presets/page',
] as const;

const adminCmsRouteImports = [
  '@/app/(admin)/admin/cms/page',
  '@/app/(admin)/admin/cms/builder/page',
  '@/app/(admin)/admin/cms/builder/settings/page',
  '@/app/(admin)/admin/cms/pages/page',
  '@/app/(admin)/admin/cms/pages/create/page',
  '@/app/(admin)/admin/cms/pages/[id]/edit/page',
  '@/app/(admin)/admin/cms/pages/[id]/edit/layout',
  '@/app/(admin)/admin/cms/slugs/page',
  '@/app/(admin)/admin/cms/slugs/create/page',
  '@/app/(admin)/admin/cms/slugs/[id]/edit/page',
  '@/app/(admin)/admin/cms/themes/page',
  '@/app/(admin)/admin/cms/themes/create/page',
  '@/app/(admin)/admin/cms/themes/[id]/edit/page',
  '@/app/(admin)/admin/cms/zones/page',
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
