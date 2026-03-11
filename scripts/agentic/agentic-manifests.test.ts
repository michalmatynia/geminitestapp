import { promises as fs } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  agenticRepoRoot,
  classifyChangedFiles,
  detectManifestPathPolicyViolations,
  loadDomainManifests,
} from './domain-manifests';

describe('agentic domain manifests', () => {
  it('parse and point only to real repo paths', async () => {
    const manifests = await loadDomainManifests();

    expect(manifests.length).toBeGreaterThanOrEqual(19);

    for (const manifest of manifests) {
      expect(['low', 'medium', 'high']).toContain(manifest.riskLevel);
      expect(manifest.impactBundles.length).toBeGreaterThan(0);

      const referencedPaths = [
        manifest.manifestPath,
        ...manifest.sourceRoots,
        ...manifest.ownedDocs,
        ...manifest.generatedArtifacts,
        ...manifest.generatedOnlyPaths,
        ...manifest.manualOnlyPaths,
      ];

      for (const referencedPath of referencedPaths) {
        await expect(
          fs.access(path.join(agenticRepoRoot, referencedPath)),
        ).resolves.toBeUndefined();
      }

      for (const target of [
        ...manifest.docGenerators,
        ...manifest.scannerTargets,
        ...manifest.validationTargets,
      ]) {
        expect(target.startsWith('//')).toBe(true);
      }

      expect(detectManifestPathPolicyViolations(manifest)).toEqual([]);
    }
  });

  it('classifies AI Paths changes into docs, scanners, validation targets, and impact bundles', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/shared/lib/ai-paths/hooks/useAiPathTriggerEvent.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'ai-paths',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('ai_paths_runtime');
    expect(classification.bundlePriorityByBundle.ai_paths_runtime).toBe('high');
    expect(classification.recommendedBundleOrder[0]).toBe('ai_paths_runtime');
    expect(classification.recommendedValidationByBundle.ai_paths_runtime).toEqual(
      expect.arrayContaining([
        '//:lint',
        '//:typecheck',
        '//:unit',
        '//:case_resolver_regression',
        '//:products_trigger_queue_unit',
      ]),
    );
    expect(classification.requiredDocGenerators).toContain(
      '//:ai_paths_node_docs',
    );
    expect(classification.requiredScannerTargets).toContain(
      '//:ai_paths_canonical',
    );
    expect(classification.requiredValidationTargets).toContain(
      '//:case_resolver_regression',
    );
  });

  it('classifies Products changes into integration and queue validation targets', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/products/hooks/useProductAiPathsRunSync.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'products',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('product_data_pipeline');
    expect(
      classification.recommendedValidationByBundle.product_data_pipeline,
    ).toEqual(
      expect.arrayContaining([
        '//:lint',
        '//:typecheck',
        '//:unit',
        '//:integration_prisma',
        '//:integration_mongo',
        '//:products_trigger_queue_unit',
      ]),
    );
    expect(classification.requiredValidationTargets).toEqual(
      expect.arrayContaining([
        '//:integration_prisma',
        '//:integration_mongo',
        '//:products_trigger_queue_unit',
      ]),
    );
  });

  it('classifies Auth changes into the security smoke validation lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/shared/lib/auth/settings-manage-access.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'auth',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('security_access');
    expect(classification.requiredValidationTargets).toContain(
      '//:security_smoke',
    );
  });

  it('classifies Admin changes into the accessibility smoke validation lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/admin/pages/AdminSettingsHomePage.tsx'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'admin',
    );
    expect(classification.highestRiskLevel).toBe('medium');
    expect(classification.requiredImpactBundles).toContain('admin_experience');
    expect(classification.requiredValidationTargets).toContain(
      '//:accessibility_smoke',
    );
  });

  it('classifies App Embeds changes into the accessibility smoke validation lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/app-embeds/pages/AdminAppEmbedsPage.tsx'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'app-embeds',
    );
    expect(classification.highestRiskLevel).toBe('medium');
    expect(classification.requiredImpactBundles).toContain('embedded_surfaces');
    expect(classification.requiredValidationTargets).toContain(
      '//:accessibility_smoke',
    );
  });

  it('classifies Case Resolver changes into the dedicated regression lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/case-resolver-capture/index.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'case-resolver',
    );
    expect(classification.requiredImpactBundles).toContain('case_resolver_runtime');
    expect(classification.requiredValidationTargets).toContain(
      '//:case_resolver_regression',
    );
    expect(classification.requiredDocs).toContain('docs/case-resolver');
  });

  it('classifies Files changes into the security smoke lane and storage doc ownership', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/files/pages/AdminFileStorageSettingsPage.tsx'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'files',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('file_storage');
    expect(classification.requiredDocs).toContain(
      'docs/plans/fastcomet-storage-plan.md',
    );
    expect(classification.requiredValidationTargets).toContain(
      '//:security_smoke',
    );
  });

  it('classifies NotesApp changes into the accessibility smoke validation lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/notesapp/pages/AdminNotesPage.tsx'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'notesapp',
    );
    expect(classification.highestRiskLevel).toBe('medium');
    expect(classification.requiredImpactBundles).toContain('notes_authoring');
    expect(classification.requiredValidationTargets).toContain(
      '//:accessibility_smoke',
    );
  });

  it('propagates generated-only path policies from impacted domains', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/shared/lib/observability/log-triage-presets.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'observability',
    );
    expect(classification.generatedOnlyPaths).toContain('docs/metrics');
    expect(classification.requiredImpactBundles).toContain('observability_contracts');
    expect(classification.highestRiskLevel).toBe('medium');
  });

  it('classifies Prompt Engine changes into validator docs generation and scanning', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/shared/lib/prompt-engine/index.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'prompt-engine',
    );
    expect(classification.requiredImpactBundles).toContain('prompt_validation');
    expect(classification.requiredGeneratedArtifacts).toContain('docs/validator');
    expect(classification.generatedOnlyPaths).toContain('docs/validator');
    expect(classification.requiredDocGenerators).toContain(
      '//:validator_docs_generate',
    );
    expect(classification.requiredScannerTargets).toContain(
      '//:validator_docs_check',
    );
  });

  it('classifies Internationalization changes into canonical sitewide scanning', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/internationalization/lib/internationalizationFallback.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'internationalization',
    );
    expect(classification.highestRiskLevel).toBe('medium');
    expect(classification.requiredImpactBundles).toContain('localization_surface');
    expect(
      classification.recommendedValidationByBundle.localization_surface,
    ).toEqual(
      expect.arrayContaining(['//:lint', '//:typecheck', '//:unit']),
    );
    expect(classification.requiredScannerTargets).toContain(
      '//:canonical_sitewide',
    );
  });

  it('orders recommended bundles by descending risk before name', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      [
        'src/features/admin/pages/AdminSettingsHomePage.tsx',
        'src/features/product-sync/services/product-sync-service.ts',
      ],
      manifests,
    );

    expect(classification.bundlePriorityByBundle.admin_experience).toBe('medium');
    expect(classification.bundlePriorityByBundle.product_sync).toBe('high');
    expect(classification.recommendedBundleOrder).toEqual([
      'product_sync',
      'admin_experience',
    ]);
  });

  it('classifies Viewer3D changes into the critical flows validation lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/viewer3d/pages/Admin3DAssetsPage.tsx'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'viewer3d',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('viewer3d_runtime');
    expect(classification.requiredValidationTargets).toContain(
      '//:critical_flows',
    );
  });

  it('classifies Product Sync changes into the Prisma integration lane', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['src/features/product-sync/services/product-sync-service.ts'],
      manifests,
    );

    expect(classification.impactedDomains.map((domain) => domain.id)).toContain(
      'product-sync',
    );
    expect(classification.highestRiskLevel).toBe('high');
    expect(classification.requiredImpactBundles).toContain('product_sync');
    expect(classification.requiredValidationTargets).toContain(
      '//:integration_prisma',
    );
  });

  it('detects overlapping generated-only and manual-only manifest paths', () => {
    expect(
      detectManifestPathPolicyViolations({
        id: 'overlap-domain',
        ownedDocs: [],
        generatedOnlyPaths: ['docs/metrics'],
        manualOnlyPaths: ['docs', 'src'],
      }),
    ).toEqual([
      'Manifest overlap-domain has overlapping generated/manual path policies: docs/metrics <-> docs.',
    ]);
  });

  it('detects owned docs declared inside generated-only paths', () => {
    expect(
      detectManifestPathPolicyViolations({
        id: 'generated-doc-domain',
        ownedDocs: ['docs/metrics/api-error-sources-latest.md'],
        generatedOnlyPaths: ['docs/metrics'],
        manualOnlyPaths: [],
      }),
    ).toEqual([
      'Manifest generated-doc-domain declares owned doc docs/metrics/api-error-sources-latest.md inside generated-only path docs/metrics.',
    ]);
  });

  it('treats manifest edits as domain-impacting changes', async () => {
    const manifests = await loadDomainManifests();
    const classification = classifyChangedFiles(
      ['config/agentic/domains/kangur.json'],
      manifests,
    );

    expect(classification.impactedDomains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'kangur',
        }),
      ]),
    );
    expect(classification.requiredImpactBundles).toContain('learner_experience');
  });
});
