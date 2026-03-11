import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const forbiddenRuntimeCompatTokens = [
  '@/features/cms/migrations/page-builder-contract-migration',
  'migrateCmsPageBuilderComponents',
  '@/features/cms/migrations/page-builder-template-contract-migration',
  'migrateCmsPageBuilderTemplateSettingValue',
  'legacy-section-',
  'cms_section_templates.v1',
  'cms_grid_templates.v1',
  'normalizeAiString(raw[\'schemeName\'])',
  'normalizeAiString(raw[\'title\'])',
  '(raw[\'palette\'] as Record<string, unknown>)',
  '(raw[\'scheme\'] as Record<string, unknown>)',
  'normalizeAiString(colors[\'bg\'])',
  'normalizeAiString(colors[\'layer\'])',
  'normalizeAiString(colors[\'card\'])',
  'normalizeAiString(colors[\'foreground\'])',
  'normalizeAiString(colors[\'primary\'])',
  'normalizeAiString(colors[\'outline\'])',
  'pickFromText([\'background\', \'bg\'])',
  'pickFromText([\'surface\', \'card\', \'layer\'])',
  'pickFromText([\'text\', \'foreground\'])',
  'pickFromText([\'accent\', \'primary\'])',
  'pickFromText([\'border\', \'outline\'])',
  'pickFromText([\'name\', \'scheme\', \'title\'])',
  'const pickFromText = (labels: string[]): string | undefined => {',
  '// fall through to regex parsing',
  'const fenced = trimmed.match(/```(?:json)?\\s*([\\s\\S]*?)```/i);',
  'const first = trimmed.indexOf(\'{\');',
  'const last = trimmed.lastIndexOf(\'}\');',
  'extractJsonBlock(trimmed)',
];

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      if (entry === '__tests__') continue;
      if (
        absolute.includes(`${path.sep}src${path.sep}features${path.sep}cms${path.sep}migrations`)
      ) {
        continue;
      }
      files.push(...collectSourceFiles(absolute));
      continue;
    }

    if (!absolute.endsWith('.ts') && !absolute.endsWith('.tsx')) continue;
    if (absolute.endsWith('.d.ts')) continue;
    files.push(absolute);
  }

  return files;
};

describe('cms page-builder runtime legacy-compat prune guard', () => {
  it('keeps page-builder contract migration helpers out of runtime source files', () => {
    const sourceFiles = collectSourceFiles(srcRoot);
    const offenders = sourceFiles
      .filter((absolutePath: string): boolean => {
        const content = readFileSync(absolutePath, 'utf8');
        return forbiddenRuntimeCompatTokens.some((token: string): boolean =>
          content.includes(token)
        );
      })
      .map((absolutePath: string): string => path.relative(projectRoot, absolutePath));

    expect(offenders).toEqual([]);
  });
});
