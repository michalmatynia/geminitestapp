import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const kangurUiRoot = path.join(projectRoot, 'src', 'features', 'kangur', 'ui');

const KANGUR_VISUAL_CONTRACTS = [
  {
    file: 'src/features/kangur/ui/KangurFeatureApp.tsx',
    requiredTokens: [
      'fixed inset-0 flex items-center justify-center',
      'w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin',
    ],
  },
  {
    file: 'src/features/kangur/ui/pages/Game.tsx',
    requiredTokens: ['min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'],
  },
  {
    file: 'src/features/kangur/ui/pages/Lessons.tsx',
    requiredTokens: ['min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100'],
  },
  {
    file: 'src/features/kangur/ui/pages/ParentDashboard.tsx',
    requiredTokens: ['min-h-screen bg-gradient-to-br from-slate-100 to-blue-50'],
  },
  {
    file: 'src/features/kangur/ui/components/PageNotFound.tsx',
    requiredTokens: [
      'min-h-screen flex items-center justify-center p-6 bg-slate-50',
      'Page Not Found',
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
    return /\/(components?|ui|pages?)\b/.test(importPath);
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
