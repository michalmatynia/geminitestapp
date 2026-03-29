import { readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { KANGUR_DEDICATED_APP_STABLE_PATHS } from '@/features/kangur/config/routing';

const MOBILE_APP_ROUTES_DIR = path.join(process.cwd(), 'apps/mobile/app');
const BRANCH_LOCAL_MOBILE_ROUTES = new Set(['parent']);

const readStableMobileRoutePaths = (): string[] =>
  readdirSync(MOBILE_APP_ROUTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => entry.name.replace(/\.tsx$/, ''))
    .filter((routeName) => !routeName.startsWith('_') && !routeName.startsWith('+'))
    .filter((routeName) => !BRANCH_LOCAL_MOBILE_ROUTES.has(routeName))
    .map((routeName) => (routeName === 'index' ? '' : routeName))
    .sort();

describe('kangur dedicated app mobile contract', () => {
  it('matches the stable Expo route inventory', () => {
    expect(KANGUR_DEDICATED_APP_STABLE_PATHS).toEqual(readStableMobileRoutePaths());
  });
});
