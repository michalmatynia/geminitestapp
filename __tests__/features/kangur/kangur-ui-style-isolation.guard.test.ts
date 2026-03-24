import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const kangurUiRoot = path.join(projectRoot, 'src', 'features', 'kangur', 'ui');

const KANGUR_VISUAL_CONTRACTS = [
  {
    file: 'src/features/kangur/ui/KangurFeatureApp.tsx',
    requiredTokens: [
      'shouldHideTopNavigationDuringBoot ? null',
      'offsetTopBar={shouldReserveTopBarOffset}',
      'visible={isBootLoaderBlockingNavigation}',
      'data-testid=\'kangur-route-content\'',
    ],
  },
  {
    file: 'src/features/kangur/ui/components/KangurPageTransitionSkeleton.tsx',
    requiredTokens: [
      'data-testid=\'kangur-page-transition-skeleton\'',
      'z-30 cursor-progress overflow-hidden',
      'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
    ],
  },
  {
    file: 'src/features/kangur/ui/KangurFeatureRouteShell.tsx',
    requiredTokens: ['kangur-premium-bg', 'data-testid=\'kangur-route-shell\''],
  },
  {
    file: 'src/features/kangur/ui/KangurSurfaceClassSync.tsx',
    requiredTokens: ['kangur-surface-active', "document.getElementById('app-content')"],
  },
  {
    file: 'src/app/(frontend)/kangur/(app)/layout.tsx',
    requiredTokens: ['KangurFeatureRouteShell'],
  },
  {
    file: 'src/features/kangur/ui/KangurFeaturePage.tsx',
    requiredTokens: ['kangur-premium-bg', 'data-testid=\'kangur-feature-page-shell\''],
  },
  {
    file: 'src/features/kangur/ui/pages/Game.tsx',
    requiredTokens: ['<KangurPageShell tone=\'play\'', 'id=\'kangur-game-page\''],
  },
  {
    file: 'src/features/kangur/ui/pages/Lessons.tsx',
    requiredTokens: ['tone=\'learn\'', 'id=\'kangur-lessons-page\''],
  },
  {
    file: 'src/features/kangur/ui/pages/ParentDashboard.tsx',
    requiredTokens: ['tone=\'dashboard\'', 'id=\'kangur-parent-dashboard-page\''],
  },
  {
    file: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
    requiredTokens: [
      "tone='profile'",
      
    ],
  },
  {
    file: 'src/features/kangur/ui/components/PageNotFound.tsx',
    requiredTokens: [
      'data-testid=\'page-not-found-shell\'',
      'kangur-premium-bg',
      
    ],
  },
  {
    file: 'src/features/kangur/ui/KangurErrorFallback.tsx',
    requiredTokens: [
      'data-testid=\'kangur-error-shell\'',
      'kangur-premium-bg',
      "translations('backToHome')",
    ],
  },
  {
    file: 'src/app/(frontend)/kangur/error.tsx',
    requiredTokens: ['KangurErrorFallback', "homeHref='/kangur'"],
  },
  {
    file: 'src/features/kangur/ui/KangurLoginPage.tsx',
    requiredTokens: [
      'data-testid=\'kangur-login-shell\'',
      "translations('defaultLoginTitle')",
      "translations('haveAccount')",
    ],
  },
  {
    file: 'src/app/(frontend)/kangur/login/page.tsx',
    requiredTokens: ['KangurFeatureRouteShell', "translations('routeLoading')"],
  },
  {
    file: 'src/app/globals.css',
    requiredTokens: [
      'kangur-surface-active',
      '--kangur-soft-card-border',
    ],
  },
] as const;

const IMPORT_FROM_RE = /(?:import|export)\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const listSourceFiles = (absoluteDir: string): string[] => {
  const entries = readdirSync(absoluteDir);
  return entries.flatMap((entry) => {
    const absolute = path.join(absoluteDir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (entry === '__tests__') return [];
      return listSourceFiles(absolute);
    }
    if (!entry.endsWith('.ts') && !entry.endsWith('.tsx') && !entry.endsWith('.js') && !entry.endsWith('.jsx')) {
      return [];
    }
    return [absolute];
  });
};

const collectImportPaths = (source: string): string[] => {
  const imports: string[] = [];

  IMPORT_FROM_RE.lastIndex = 0;
  DYNAMIC_IMPORT_RE.lastIndex = 0;

  let fromMatch: RegExpExecArray | null = IMPORT_FROM_RE.exec(source);
  while (fromMatch) {
    imports.push(fromMatch[1]);
    fromMatch = IMPORT_FROM_RE.exec(source);
  }

  let dynamicMatch: RegExpExecArray | null = DYNAMIC_IMPORT_RE.exec(source);
  while (dynamicMatch) {
    imports.push(dynamicMatch[1]);
    dynamicMatch = DYNAMIC_IMPORT_RE.exec(source);
  }

  return imports;
};

const isForbiddenKangurUiImport = (importPath: string): boolean => {
  if (importPath === '@/features/cms/components/frontend/CmsStorefrontAppearance' ||
    importPath === '@/shared/ui/dropdown-menu' ||
    importPath === '@/shared/ui/radix-overlay-content-shell') {
    return false;
  }

  if (importPath.startsWith('@/shared/ui')) {
    return true;
  }

  if (importPath.startsWith('@/app/')) {
    return true;
  }

  if (importPath.startsWith('@/components/')) {
    return true;
  }

  if (importPath.startsWith('@/features/admin')) {
    return true;
  }

  if (importPath.startsWith('@/features/') && !importPath.startsWith('@/features/kangur/')) {
    return /\/(?:components?|ui|pages?)(?:\/|$)/.test(importPath);
  }

  return false;
};

describe('kangur ui style and isolation guardrails', () => {
  it('keeps critical Kangur visual shell tokens in source', () => {
    const missing: string[] = [];

    KANGUR_VISUAL_CONTRACTS.forEach((contract) => {
      const absolute = path.join(projectRoot, contract.file);
      const source = readFileSync(absolute, 'utf8');

      contract.requiredTokens.forEach((token) => {
        if (!source.includes(token)) {
          missing.push(`${contract.file} missing visual token "${token}"`);
        }
      });
    });

    expect(missing).toEqual([]);
  });

  it('prevents Kangur UI from importing shared/admin/global UI component layers', () => {
    const sourceFiles = listSourceFiles(kangurUiRoot);
    const offenders: string[] = [];

    sourceFiles.forEach((absolute) => {
      const source = readFileSync(absolute, 'utf8');
      const imports = collectImportPaths(source);
      imports.forEach((importPath) => {
        if (!isForbiddenKangurUiImport(importPath)) {
          return;
        }

        offenders.push(`${path.relative(projectRoot, absolute)} -> ${importPath}`);
      });
    });

    expect(offenders).toEqual([]);
  });
});
