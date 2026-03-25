import { describe, expect, it } from 'vitest';

import {
  APP_EMBED_SETTING_KEY,
  DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE,
  appEmbedIdSchema,
  createAppEmbedSchema,
} from '@/shared/contracts/app-embeds';
import { AgentCapabilityManifestSchema } from '@/shared/contracts/agent-capabilities';
import { AgentLeaseMutationResultSchema } from '@/shared/contracts/agent-leases';
import {
  DOCUMENTATION_MODULE_IDS,
  documentationEntrySchema,
  documentationModuleIdsSchema,
  documentationUiDocSchema,
} from '@/shared/contracts/documentation';
import {
  apiEnvelopeSchema,
  httpResultSchema,
  paginatedResponseSchema,
} from '@/shared/contracts/http';
import {
  collectSectionComponentIds,
  kangurLessonSectionSchema,
} from '@/shared/contracts/kangur-lesson-sections';

describe('shared contracts runtime coverage bundle', () => {
  it('parses http and app embed payloads', () => {
    expect(
      apiEnvelopeSchema.parse({
        success: true,
        data: { id: 'row-1' },
      })
    ).toEqual({
      success: true,
      data: { id: 'row-1' },
    });

    expect(
      httpResultSchema.parse({
        ok: false,
        error: 'broken',
      })
    ).toEqual({
      ok: false,
      error: 'broken',
    });

    expect(
      paginatedResponseSchema.parse({
        data: [{ id: 'row-1' }],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      })
    ).toEqual(
      expect.objectContaining({
        data: [{ id: 'row-1' }],
      })
    );

    expect(
      createAppEmbedSchema.parse({
        name: 'Kangur widget',
        type: 'widget',
        config: { theme: 'light' },
        embedCode: '<div data-app="kangur"></div>',
        enabled: true,
      })
    ).toEqual(
      expect.objectContaining({
        name: 'Kangur widget',
        type: 'widget',
        enabled: true,
      })
    );
    expect(appEmbedIdSchema.parse('kangur')).toBe('kangur');
    expect(APP_EMBED_SETTING_KEY).toBe('cms_app_embeds');
    expect(DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE).toBe('Game');
  });

  it('keeps documentation constants aligned with the runtime schema', () => {
    Object.values(DOCUMENTATION_MODULE_IDS).forEach((moduleId) => {
      expect(documentationModuleIdsSchema.parse(moduleId)).toBe(moduleId);
    });

    expect(
      documentationEntrySchema.parse({
        id: 'products:getting-started',
        moduleId: 'products',
        title: 'Products',
        content: 'Product module docs',
        keywords: ['catalog', 'products'],
        relatedLinks: ['https://example.test/products'],
      })
    ).toEqual(
      expect.objectContaining({
        moduleId: 'products',
      })
    );

    expect(
      documentationUiDocSchema.parse({
        id: 'ui-products',
        moduleId: 'products',
        title: 'Products UI',
        description: 'How the products page is structured',
        relatedFunctions: ['renderProductsPage'],
      })
    ).toEqual(
      expect.objectContaining({
        relatedFunctions: ['renderProductsPage'],
      })
    );
  });

  it('applies Kangur lesson defaults and collects nested component ids', () => {
    const section = kangurLessonSectionSchema.parse({
      id: 'math-basics',
      subject: 'maths',
      ageGroup: 'six_year_old',
      label: 'Math basics',
      sortOrder: 1,
      componentIds: ['adding'],
      subsections: [
        {
          id: 'math-subsection',
          label: 'Subtraction',
          sortOrder: 2,
          componentIds: ['subtracting'],
        },
      ],
    });

    expect(section.enabled).toBe(true);
    expect(section.typeLabel).toBe('Section');
    expect(section.subsections[0]?.enabled).toBe(true);
    expect(section.subsections[0]?.typeLabel).toBe('Subsection');
    expect(collectSectionComponentIds(section)).toEqual(['adding', 'subtracting']);
  });

  it('parses agent capability and lease payloads with defaults', () => {
    const manifest = AgentCapabilityManifestSchema.parse({
      version: '1',
      generatedAt: '2026-03-25T10:00:00.000Z',
      summary: 'Capability manifest',
      executionModel: {
        eventLog: 'append-only',
        checkpoints: 'required',
        resourceClaims: 'required',
        handoff: 'supported',
        mutationPolicy: 'forward-only',
        conflictPolicy: 'lease-owner-wins',
      },
      resources: [
        {
          resourceType: 'queue',
          resourceId: 'jobs',
          name: 'Jobs queue',
          summary: 'Protects queue writes',
          mode: 'exclusive',
          requiresLease: true,
        },
      ],
      approvalGates: [
        {
          id: 'prod-write',
          name: 'Production write',
          summary: 'Requires operator approval',
          policy: 'operator_approval',
        },
      ],
      capabilities: [
        {
          id: 'replay-jobs',
          name: 'Replay jobs',
          summary: 'Replays queued jobs',
          surface: 'api',
          maturity: 'available',
          effects: ['observe', 'leased_mutation'],
          forwardOnly: true,
        },
      ],
      discovery: {
        apiRoute: '/api/agent/capabilities',
      },
    });

    expect(manifest.resources[0]?.scopeRequired).toBe(false);
    expect(manifest.resources[0]?.ownerAgentEnvKeys).toEqual([]);
    expect(manifest.capabilities[0]?.approvalGateIds).toEqual([]);

    expect(
      AgentLeaseMutationResultSchema.parse({
        ok: false,
        code: 'conflict',
        message: 'Lease already owned by another run',
      })
    ).toEqual({
      ok: false,
      code: 'conflict',
      message: 'Lease already owned by another run',
      state: null,
      lease: null,
      conflictingLease: null,
      event: null,
    });
  });
});
