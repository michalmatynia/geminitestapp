import { describe, expect, it } from 'vitest';

import {
  adminMenuCustomNodeSchema,
  adminNavLeafSchema,
} from '@/shared/contracts/admin';
import {
  buildColorSchemeMap,
  CMS_THEME_SETTINGS_KEY,
  DEFAULT_THEME,
  normalizeThemeSettings,
  themeSettingsSchema,
} from '@/shared/contracts/cms-theme';
import {
  cmsCssAiConfigSchema,
  cmsDomainCreateSchema,
  cmsPageComponentRequestSchema,
  cmsSlugUpdateSchema,
  DEFAULT_CMS_DOMAIN_SETTINGS,
  DEFAULT_CUSTOM_CSS_AI_CONFIG,
  normalizeCmsDomainSettings,
} from '@/shared/contracts/cms';
import { databasePreviewPayloadSchema } from '@/shared/contracts/database';
import { folderTreeNodeSchema } from '@/shared/contracts/foldertree';
import {
  chatbotAgentRunActionRouteParamsSchema,
  chatbotSessionMessageCreateRequestSchema,
  DEFAULT_AGENT_SETTINGS,
} from '@/shared/contracts/chatbot';
import {
  normalizeImageStudioAnalysisMode,
  imageStudioAnalysisRequestSchema,
} from '@/shared/contracts/image-studio/analysis';
import {
  buildKangurSocialPostCombinedBody,
  hasKangurSocialLinkedInPublication,
  hasKangurSocialLinkedInPublicationTarget,
  parseKangurSocialPostStore,
} from '@/shared/contracts/kangur-social-posts';
import {
  kangurGameCatalogQuerySchema,
  kangurLaunchableGameRuntimeSpecSchema,
} from '@/shared/contracts/kangur-games';
import { kangurLessonGameSectionsReplacePayloadSchema } from '@/shared/contracts/kangur-lesson-game-sections';
import {
  personaMemorySearchResponseSchema,
  personaMemorySummarySchema,
} from '@/shared/contracts/persona-memory';
import { promptLibraryItemBaseSchema } from '@/shared/contracts/prompts';
import {
  promptExploderListItemSchema,
  promptExploderLogicalJoinGroupSchema,
} from '@/shared/contracts/prompt-exploder/base';
import { promptExploderDocumentSchema } from '@/shared/contracts/prompt-exploder/document';
import {
  DEFAULT_PRODUCT_SYNC_FIELD_RULES,
  productSyncProfileCreatePayloadSchema,
  productSyncProfileSchema,
  productSyncRunListQuerySchema,
} from '@/shared/contracts/product-sync';
import {
  productCatalogRecordSchema,
  productProducerRelationSchema,
  productTagRelationSchema,
} from '@/shared/contracts/products/product';
import {
  productCategoryFiltersSchema,
  productCategoryWithChildrenSchema,
  reorderProductCategorySchema,
  toProductCategorySummaryDto,
} from '@/shared/contracts/products/categories';
import {
  noteCategoryRecordWithChildrenSchema,
  noteFolderImportRequestSchema,
} from '@/shared/contracts/notes';

const ISO_TIMESTAMP = '2026-03-30T10:00:00.000Z';

describe('shared contracts runtime smoke', () => {
  it('normalizes theme settings and builds color-scheme maps from objects or arrays', () => {
    expect(themeSettingsSchema.parse(DEFAULT_THEME).themePreset).toBe('default');
    expect(CMS_THEME_SETTINGS_KEY).toBe('cms_theme_settings.v1');

    expect(normalizeThemeSettings(DEFAULT_THEME).primaryColor).toBe(DEFAULT_THEME.primaryColor);
    expect(normalizeThemeSettings({ primaryColor: '#000000' }).primaryColor).toBe('#000000');
    expect(
      normalizeThemeSettings([] as unknown as Partial<typeof DEFAULT_THEME>, DEFAULT_THEME)
    ).toEqual(DEFAULT_THEME);

    expect(buildColorSchemeMap(DEFAULT_THEME)['scheme-1']?.accent).toBe('#3b82f6');
    expect(buildColorSchemeMap(DEFAULT_THEME.colorSchemes)['scheme-1']?.border).toBe('#1f2937');
  });

  it('parses cms config payloads and normalizes domain settings', () => {
    expect(cmsDomainCreateSchema.parse({ domain: 'example.com' }).domain).toBe('example.com');
    expect(
      cmsSlugUpdateSchema.parse({
        slug: 'home',
        locale: 'en',
        isDefault: true,
      }).locale
    ).toBe('en');

    expect(
      cmsCssAiConfigSchema.parse({
        provider: 'agent',
        agentId: 'agent-1',
      }).provider
    ).toBe('agent');

    expect(DEFAULT_CUSTOM_CSS_AI_CONFIG.provider).toBe('model');
    expect(normalizeCmsDomainSettings(undefined)).toEqual(DEFAULT_CMS_DOMAIN_SETTINGS);
    expect(normalizeCmsDomainSettings({ zoningEnabled: false })).toEqual({
      zoningEnabled: false,
    });
  });

  it('parses chatbot route params and session message payloads', () => {
    expect(
      chatbotSessionMessageCreateRequestSchema.parse({
        role: 'user',
        content: 'Hello there',
        images: ['https://example.com/image.jpg'],
      }).content
    ).toBe('Hello there');

    expect(
      chatbotAgentRunActionRouteParamsSchema.parse({
        runId: 'run-1',
        action: 'resume',
      }).action
    ).toBe('resume');

    expect(DEFAULT_AGENT_SETTINGS.maxSteps).toBeGreaterThan(0);
  });

  it('parses product category trees, filters, and reorder payloads', () => {
    const category = productCategoryWithChildrenSchema.parse({
      id: 'category-1',
      name: 'Books',
      description: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-1',
      children: [
        {
          id: 'category-2',
          name: 'Children',
          description: null,
          color: null,
          parentId: 'category-1',
          catalogId: 'catalog-1',
          children: [],
        },
      ],
    });

    expect(category.children).toHaveLength(1);
    expect(toProductCategorySummaryDto(category)).toMatchObject({
      id: 'category-1',
      name: 'Books',
      parentId: null,
    });
    expect(productCategoryFiltersSchema.parse({ parentId: null }).parentId).toBeNull();
    expect(
      reorderProductCategorySchema.parse({
        categoryId: 'category-2',
        parentId: 'category-1',
        position: 'inside',
        targetId: null,
      }).position
    ).toBe('inside');
  });

  it('parses product sync profiles and list-query payloads', () => {
    const fieldRules = DEFAULT_PRODUCT_SYNC_FIELD_RULES.map((rule, index) => ({
      id: `rule-${index + 1}`,
      ...rule,
    }));

    expect(
      productSyncProfileCreatePayloadSchema.parse({
        name: 'Base sync',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        batchSize: 50,
      }).batchSize
    ).toBe(50);

    expect(
      productSyncProfileSchema.parse({
        id: 'profile-1',
        name: 'Base sync',
        description: null,
        enabled: true,
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: null,
        scheduleIntervalMinutes: 60,
        batchSize: 50,
        conflictPolicy: 'skip',
        fieldRules,
        lastRunAt: null,
        createdAt: ISO_TIMESTAMP,
        updatedAt: null,
      }).fieldRules
    ).toHaveLength(fieldRules.length);

    expect(productSyncRunListQuerySchema.parse({ limit: '25' }).limit).toBe(25);
  });

  it('parses persona-memory and prompt-library payloads', () => {
    expect(
      personaMemorySearchResponseSchema.parse({
        items: [
          {
            id: 'record-1',
            personaId: 'persona-1',
            recordType: 'memory_entry',
            content: 'Remember the user prefers short summaries.',
            tags: ['preferences'],
            topicHints: ['summaries'],
            moodHints: ['neutral'],
            createdAt: ISO_TIMESTAMP,
            updatedAt: null,
          },
        ],
        summary: personaMemorySummarySchema.parse({
          personaId: 'persona-1',
          suggestedMoodId: 'neutral',
          totalRecords: 1,
          memoryEntryCount: 1,
          conversationMessageCount: 0,
        }),
      }).summary.totalRecords
    ).toBe(1);

    expect(
      promptLibraryItemBaseSchema.parse({
        id: 'prompt-1',
        name: 'Draft outline',
        prompt: 'Write a concise outline.',
        createdAt: ISO_TIMESTAMP,
        updatedAt: ISO_TIMESTAMP,
      }).name
    ).toBe('Draft outline');
  });

  it('parses kangur game and lesson-game-section payloads', () => {
    expect(
      kangurLaunchableGameRuntimeSpecSchema.parse({
        kind: 'launchable_game_screen',
        screen: 'addition_quiz',
        rendererId: 'adding_ball_game',
        shell: {
          accent: 'amber',
          icon: '1',
          shellTestId: 'game-shell-1',
        },
      }).finishMode
    ).toBe('default');

    expect(
      kangurGameCatalogQuerySchema.parse({
        subject: 'music',
        ageGroup: 'six_year_old',
        gameStatus: 'active',
        surface: 'library',
        mechanic: 'multiple_choice',
        engineCategory: 'foundational',
        implementationOwnership: 'shared_runtime',
        launchableOnly: 'true',
      }).launchableOnly
    ).toBe(true);

    expect(
      kangurLessonGameSectionsReplacePayloadSchema.parse({
        gameId: 'game-1',
        sections: [
          {
            id: 'section-1',
            lessonComponentId: 'clock',
            gameId: 'game-1',
            title: 'Clock section',
            description: 'Practice reading the clock',
            emoji: 'CLK',
            sortOrder: 1,
            settings: {
              clock: {
                initialMode: 'practice',
                showModeSwitch: true,
              },
            },
          },
        ],
      }).sections
    ).toHaveLength(1);
  });

  it('parses kangur social post stores and normalizes helper outputs', () => {
    expect(buildKangurSocialPostCombinedBody(' Czesc ', ' Hello ')).toBe('Czesc\n---\nHello');
    expect(buildKangurSocialPostCombinedBody(' Czesc ', '   ')).toBe('Czesc');
    expect(buildKangurSocialPostCombinedBody('   ', ' Hello ')).toBe('Hello');
    expect(buildKangurSocialPostCombinedBody('   ', '   ')).toBe('');

    expect(hasKangurSocialLinkedInPublication(undefined)).toBe(false);
    expect(
      hasKangurSocialLinkedInPublication({
        status: 'published',
        publishedAt: null,
        linkedinPostId: null,
        linkedinUrl: null,
      })
    ).toBe(true);
    expect(
      hasKangurSocialLinkedInPublication({
        status: 'draft',
        publishedAt: '2026-03-30T10:00:00.000Z',
        linkedinPostId: null,
        linkedinUrl: null,
      })
    ).toBe(true);
    expect(
      hasKangurSocialLinkedInPublication({
        status: 'draft',
        publishedAt: null,
        linkedinPostId: null,
        linkedinUrl: null,
      })
    ).toBe(false);
    expect(
      hasKangurSocialLinkedInPublicationTarget({
        linkedinPostId: 'post-1',
        linkedinUrl: null,
      })
    ).toBe(true);
    expect(
      hasKangurSocialLinkedInPublicationTarget({
        linkedinPostId: '   ',
        linkedinUrl: 'https://linkedin.com/posts/1',
      })
    ).toBe(true);
    expect(hasKangurSocialLinkedInPublicationTarget(null)).toBe(false);

    const store = parseKangurSocialPostStore({
      posts: [
        {
          id: 'post-1',
          bodyPl: ' Czesc ',
          bodyEn: ' Hello ',
          combinedBody: '',
          imageAssets: [{ id: 'image-1' }],
          visualSummary: '  ',
          visualHighlights: [' New banner '],
        },
        {
          id: 'post-2',
          bodyPl: 'Wstep',
          bodyEn: 'Intro',
          combinedBody: 'Already combined',
          visualSummary: '  Summary  ',
          visualHighlights: ['  First  ', 'Second'],
        },
      ],
    });

    expect(store.version).toBe(1);
    expect(store.posts[0]?.combinedBody).toBe('Czesc\n---\nHello');
    expect(store.posts[0]?.visualSummary).toBeNull();
    expect(store.posts[0]?.visualHighlights).toEqual(['New banner']);
    expect(store.posts[1]?.combinedBody).toBe('Already combined');
    expect(store.posts[1]?.visualSummary).toBe('Summary');
    expect(store.posts[1]?.visualHighlights).toEqual(['First', 'Second']);
  });

  it('parses image-studio analysis requests and normalizes modes', () => {
    expect(normalizeImageStudioAnalysisMode(' server_analysis ')).toBe('server_analysis');
    expect(normalizeImageStudioAnalysisMode('invalid')).toBeNull();

    expect(
      imageStudioAnalysisRequestSchema.parse({
        mode: 'client_analysis',
        requestId: 'analysis-1',
        layout: {
          paddingPercent: 8,
        },
      }).mode
    ).toBe('client_analysis');
  });

  it('parses prompt-exploder structures with recursive items and segments', () => {
    expect(
      promptExploderLogicalJoinGroupSchema.parse({
        type: 'AND',
        conditions: [
          {
            id: 'condition-1',
            paramPath: 'params.theme',
            comparator: 'equals',
            value: 'dark',
          },
        ],
      }).conditions
    ).toHaveLength(1);

    expect(
      promptExploderListItemSchema.parse({
        id: 'item-1',
        label: 'Theme',
        logicalConditions: [
          {
            id: 'condition-1',
            paramPath: 'params.theme',
            comparator: 'equals',
            value: 'dark',
          },
        ],
        children: [
          {
            id: 'child-1',
            text: 'Child item',
          },
        ],
      }).children
    ).toHaveLength(1);

    expect(
      promptExploderDocumentSchema.parse({
        id: 'document-1',
        bindings: [
          {
            key: 'theme',
            type: 'text',
          },
        ],
        sections: [
          {
            id: 'section-1',
            title: 'Intro',
            segments: [
              {
                id: 'segment-1',
                type: 'static',
                subsections: [
                  {
                    id: 'subsection-1',
                    title: 'Details',
                    items: [{ id: 'item-2', text: 'More detail' }],
                  },
                ],
              },
            ],
          },
        ],
      }).sections
    ).toHaveLength(1);
  });

  it('parses product relation records with nested catalog, tag, and producer payloads', () => {
    expect(
      productCatalogRecordSchema.parse({
        productId: 'product-1',
        catalogId: 'catalog-1',
        assignedAt: ISO_TIMESTAMP,
        catalog: {
          id: 'catalog-1',
          name: 'Default catalog',
          description: null,
          isDefault: true,
          languageIds: ['en'],
          defaultLanguageId: 'en',
          defaultPriceGroupId: null,
          priceGroupIds: ['price-group-1'],
          createdAt: ISO_TIMESTAMP,
          updatedAt: null,
        },
      }).catalog.name
    ).toBe('Default catalog');

    expect(
      productTagRelationSchema.parse({
        productId: 'product-1',
        tagId: 'tag-1',
        assignedAt: ISO_TIMESTAMP,
        tag: {
          id: 'tag-1',
          name: 'Featured',
          description: null,
          color: null,
          catalogId: 'catalog-1',
          createdAt: ISO_TIMESTAMP,
          updatedAt: null,
        },
      }).tag?.name
    ).toBe('Featured');

    expect(
      productProducerRelationSchema.parse({
        productId: 'product-1',
        producerId: 'producer-1',
        assignedAt: ISO_TIMESTAMP,
        producer: {
          id: 'producer-1',
          name: 'Acme',
          description: null,
          website: null,
          createdAt: ISO_TIMESTAMP,
          updatedAt: null,
        },
      }).producer?.name
    ).toBe('Acme');
  });

  it('parses recursive admin, database, notes, folder-tree, and cms-builder payloads', () => {
    expect(
      adminMenuCustomNodeSchema.parse({
        id: 'root',
        label: 'Root',
        children: [{ id: 'child', href: '/child' }],
      }).children
    ).toHaveLength(1);

    expect(
      adminNavLeafSchema.parse({
        id: 'leaf-1',
        label: 'Dashboard',
        parents: ['root'],
        item: {
          id: 'root',
          label: 'Root',
          children: [{ id: 'leaf-1', label: 'Dashboard', href: '/admin' }],
        },
      }).item.children
    ).toHaveLength(1);

    expect(
      databasePreviewPayloadSchema.parse({
        type: 'mongodb',
        mode: 'tables',
        tableDetails: [
          {
            name: 'products',
            columns: [
              {
                name: 'id',
                type: 'string',
                nullable: false,
                defaultValue: null,
                isPrimaryKey: true,
                isForeignKey: false,
              },
            ],
            indexes: [
              {
                name: 'products_id_idx',
                columns: ['id'],
                isUnique: true,
              },
            ],
            foreignKeys: [],
          },
        ],
        enums: [
          {
            name: 'status',
            values: ['draft', 'published'],
          },
        ],
      }).tableDetails
    ).toHaveLength(1);

    expect(
      noteCategoryRecordWithChildrenSchema.parse({
        id: 'category-1',
        name: 'Ideas',
        description: null,
        color: null,
        parentId: null,
        notebookId: null,
        themeId: null,
        sortIndex: null,
        children: [
          {
            id: 'category-2',
            name: 'Drafts',
            description: null,
            color: null,
            parentId: 'category-1',
            notebookId: null,
            themeId: null,
            sortIndex: null,
            children: [],
          },
        ],
      }).children
    ).toHaveLength(1);

    expect(
      noteFolderImportRequestSchema.parse({
        notebookId: 'notebook-1',
        structures: [
          {
            name: 'Ideas',
            path: '/Ideas',
            children: [],
            notes: [
              {
                title: 'Draft note',
                path: '/Ideas/draft.md',
              },
            ],
          },
        ],
      }).structures
    ).toHaveLength(1);

    expect(
      folderTreeNodeSchema.parse({
        id: 'folder-1',
        name: 'Root',
        type: 'folder',
        parentId: null,
        path: '/Root',
        size: null,
        mimeType: null,
        createdAt: ISO_TIMESTAMP,
        updatedAt: ISO_TIMESTAMP,
        children: [
          {
            id: 'file-1',
            name: 'README.md',
            type: 'file',
            parentId: 'folder-1',
            path: '/Root/README.md',
            size: 120,
            mimeType: 'text/markdown',
            createdAt: ISO_TIMESTAMP,
            updatedAt: ISO_TIMESTAMP,
            children: [],
          },
        ],
      }).children
    ).toHaveLength(1);

    expect(
      cmsPageComponentRequestSchema.parse({
        type: 'hero',
        order: 1,
        content: {
          zone: 'header',
          settings: {},
          blocks: [
            {
              id: 'block-1',
              type: 'text',
              settings: {},
              blocks: [],
            },
          ],
          sectionId: 'section-1',
          parentSectionId: null,
        },
      }).content.blocks
    ).toHaveLength(1);
  });
});
