import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { defaultImprovementTrackIds, listImprovementTracks } from './general-improvement-operations';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>;
};
const docsReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'README.md'), 'utf8');
const buildReadme = fs.readFileSync(path.join(repoRoot, 'docs', 'build', 'README.md'), 'utf8');
const generalImprovementsDoc = fs.readFileSync(
  path.join(repoRoot, 'docs', 'build', 'general-improvements.md'),
  'utf8'
);
const improvementsHubReadme = fs.readFileSync(
  path.join(repoRoot, 'docs', 'build', 'improvements', 'README.md'),
  'utf8'
);
const documentationArchitecture = fs.readFileSync(
  path.join(repoRoot, 'docs', 'documentation', 'README.md'),
  'utf8'
);
const structureManifest = fs.readFileSync(
  path.join(repoRoot, 'docs', 'documentation', 'structure-manifest.json'),
  'utf8'
);

describe('improvement operations contract', () => {
  it('keeps the improvement scripts and default bundles wired in package.json', () => {
    expect(packageJson.scripts).toMatchObject({
      'improvements:audit':
        'node --import tsx scripts/db/run-general-improvement-operations.ts --phase audit --execute',
      'improvements:classify':
        'node --import tsx scripts/db/run-general-improvement-operations.ts --phase classify --execute',
      'improvements:plan':
        'node --import tsx scripts/db/run-general-improvement-operations.ts --phase plan',
      'improvements:dry-run':
        'node --import tsx scripts/db/run-general-improvement-operations.ts --phase dry-run --execute',
      'improvements:apply':
        'node --import tsx scripts/db/run-general-improvement-operations.ts --phase apply --execute --allow-write',
      'improvements:read-only':
        'node --import tsx scripts/db/run-general-improvement-batch.ts',
      'improvements:application':
        'node --import tsx scripts/db/run-general-improvement-batch.ts --track ui-consolidation,application-performance,testing-quality-baseline,repo-quality-baseline',
      'improvements:products':
        'node --import tsx scripts/db/run-general-improvement-batch.ts --track products-parameter-integrity,products-category-schema-normalization',
      'improvements:refresh-docs':
        'node --import tsx scripts/db/generate-improvement-docs.ts',
    });
  });

  it('keeps the manifest aligned to the intended default portfolio', () => {
    expect(defaultImprovementTrackIds).toEqual([
      'products-parameter-integrity',
      'products-category-schema-normalization',
      'ui-consolidation',
      'application-performance',
      'repo-quality-baseline',
    ]);

    expect(listImprovementTracks().map((track) => track.id)).toEqual([
      'products-parameter-integrity',
      'products-category-schema-normalization',
      'ui-consolidation',
      'application-performance',
      'testing-quality-baseline',
      'repo-quality-baseline',
    ]);
  });

  it('keeps the docs hub and structure manifest wired to the new improvement surface', () => {
    expect(docsReadme).toContain('[`docs/build/improvements/README.md`](./build/improvements/README.md)');
    expect(buildReadme).toContain('[`improvements/README.md`](./improvements/README.md)');
    expect(generalImprovementsDoc).toContain('[`docs/build/improvements/README.md`](./improvements/README.md)');
    expect(generalImprovementsDoc).toContain('`npm run improvements:application`');
    expect(generalImprovementsDoc).toContain('`npm run improvements:refresh-docs`');
    expect(generalImprovementsDoc).toContain('continues through all read-only phases even if an earlier phase fails');

    expect(improvementsHubReadme).toContain('[`application-performance/README.md`](./application-performance/README.md)');
    expect(improvementsHubReadme).toContain('`npm run improvements:application`');
    expect(improvementsHubReadme).toContain('`npm run improvements:refresh-docs`');
    expect(improvementsHubReadme).toContain('Read-only batches keep running through `audit`, `classify`, and `plan`');
    expect(documentationArchitecture).toContain('| Cross-feature improvement operations | `docs/build/improvements/` |');
    expect(documentationArchitecture).toContain('Use `docs/build/improvements/`.');

    expect(structureManifest).toContain('"path": "docs/build/improvements"');
    expect(structureManifest).toContain('"docs/build/improvements/README.md"');
    expect(structureManifest).toContain('"docs/build/improvements/scan-latest.md"');
    expect(structureManifest).toContain('"docs/build/improvements/application-performance/README.md"');
    expect(structureManifest).toContain('"docs/build/improvements/ui-consolidation/scan-latest.md"');
  });
});
