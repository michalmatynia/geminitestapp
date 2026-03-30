import { describe, expect, it } from 'vitest';

const filemakerMailRouteImports = [
  '@/app/(admin)/admin/filemaker/mail/page',
  '@/app/(admin)/admin/filemaker/mail/compose/page',
  '@/app/(admin)/admin/filemaker/mail/threads/[threadId]/page',
] as const;

describe('admin filemaker mail routes', () => {
  it.each(filemakerMailRouteImports)(
    'loads %s through the filemaker public barrel',
    async (path) => {
      const routeModule = await import(path);

      expect(routeModule.default).toBeTypeOf('function');
    },
    120000
  );
});
