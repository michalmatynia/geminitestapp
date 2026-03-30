import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const adminSectionRoutesWithNestedPages = [
  '3d-assets',
  'agentcreator',
  'ai-paths',
  'auth',
  'case-resolver',
  'chatbot',
  'cms',
  'databases',
  'filemaker',
  'image-studio',
  'integrations',
  'kangur',
  'notes',
  'products',
  'prompt-engine',
  'prompt-exploder',
  'settings',
  'system',
  'validator',
] as const;

const adminRootDirectory = path.join(process.cwd(), 'src/app/(admin)/admin');

describe('admin loading route inventory', () => {
  it.each(adminSectionRoutesWithNestedPages)(
    'ensures the %s admin section has a dedicated loading route',
    (routeSegment) => {
      expect(existsSync(path.join(adminRootDirectory, routeSegment, 'loading.tsx'))).toBe(true);
    }
  );
});
