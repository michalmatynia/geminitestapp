import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

const clonePorts = (value: RuntimePortValues): RuntimePortValues =>
  JSON.parse(JSON.stringify(value)) as RuntimePortValues;

const buildNormalizeConfig = (): { nodes: AiNode[]; edges: Edge[] } => {
  const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
  if (!template) {
    throw new Error('Missing starter_product_name_normalize template');
  }

  const config = materializeStarterWorkflowPathConfig(template, {
    pathId: 'path_product_name_normalize_runtime_test',
    seededDefault: false,
  });

  return {
    nodes: (config.nodes ?? []) as AiNode[],
    edges: (config.edges ?? []) as Edge[],
  };
};

describe('engine-core normalize starter flow', () => {
  it('executes the shipped normalize starter workflow end to end with stable data flow', async () => {
    const { nodes, edges } = buildNormalizeConfig();
    const finishedOrder: string[] = [];
    const seenInputs = new Map<string, RuntimePortValues>();

    const productEntity = {
      id: 'product-1',
      categoryId: 'cat-dresses',
      name_en: 'summer floral maxi dress',
      description_en: 'Flowy summer dress with floral print and ruffled sleeves.',
      catalogs: [{ catalogId: 'catalog-1' }],
      images: [
        { url: 'https://cdn.example.com/image-1.jpg' },
        { url: 'https://cdn.example.com/image-2.jpg' },
      ],
    };
    const fetchEntityCached = vi.fn(async (entityType: string, entityId: string) => {
      expect(entityType).toBe('product');
      expect(entityId).toBe('product-1');
      return productEntity;
    });
    const enqueueModelJob = vi.fn(async (input: { prompt: string; images: string[] }) => {
      expect(input.prompt).toContain('summer floral maxi dress');
      expect(input.prompt).toContain('Women > Dresses');
      expect(input.images).toHaveLength(2);
      return {
        result: 'Floral Maxi Dress',
      };
    });

    const resolveHandler = (type: string): NodeHandler | null => {
      if (type === 'trigger') {
        return async () => ({
          trigger: {
            source: 'product-modal-normalize',
          },
          triggerName: 'Normalize Product Name',
        });
      }

      if (type === 'fetcher') {
        return async ({ triggerContext, fetchEntityCached: fetchProduct }) => {
          const entityId =
            typeof triggerContext?.['entityId'] === 'string' ? triggerContext['entityId'] : '';
          const entityType =
            typeof triggerContext?.['entityType'] === 'string' ? triggerContext['entityType'] : '';
          const context = await fetchProduct(entityType, entityId);
          return {
            context,
            meta: {
              entityId,
              entityType,
            },
            entityId,
            entityType,
          };
        };
      }

      if (type === 'parser') {
        return async ({ nodeInputs }) => {
          const context = (nodeInputs['context'] ?? {}) as typeof productEntity;
          return {
            bundle: {
              productId: context.id,
              catalogId: context.catalogs[0]?.catalogId ?? null,
              categoryId: context.categoryId,
              title: context.name_en,
              content_en: context.description_en,
            },
            images: (context.images ?? []).map((image) => image.url),
          };
        };
      }

      if (type === 'db_schema') {
        return async () => ({
          context: {
            liveContext: {
              collectionMap: {
                product_categories: {
                  documents: [
                    {
                      id: 'cat-women',
                      name_en: 'Women',
                      parentId: null,
                      catalogId: 'catalog-1',
                    },
                    {
                      id: 'cat-dresses',
                      name_en: 'Dresses',
                      parentId: 'cat-women',
                      catalogId: 'catalog-1',
                    },
                  ],
                },
              },
              fetchedAt: '2026-04-12T00:00:00.000Z',
            },
          },
          schema: {
            collections: ['product_categories'],
          },
        });
      }

      if (type === 'function') {
        return async ({ nodeInputs }) => {
          const bundle = (nodeInputs['bundle'] ?? {}) as Record<string, unknown>;
          return {
            bundle: {
              ...bundle,
              categoryContext: {
                currentCategoryId: 'cat-dresses',
                currentCategory: {
                  id: 'cat-dresses',
                  label: 'Dresses',
                  fullPath: 'Women > Dresses',
                  isLeaf: true,
                },
                allowedLeafLabels: ['Dresses'],
                leafCategories: [
                  {
                    id: 'cat-dresses',
                    label: 'Dresses',
                    fullPath: 'Women > Dresses',
                  },
                ],
              },
            },
          };
        };
      }

      if (type === 'prompt') {
        return async ({ nodeInputs }) => {
          const bundle = nodeInputs['bundle'] as {
            title: string;
            content_en: string;
            categoryContext: { currentCategory: { fullPath: string } };
          };
          const images = (nodeInputs['images'] ?? []) as string[];
          return {
            prompt: [
              `Normalize ${bundle.title}.`,
              `Description: ${bundle.content_en}`,
              `Category: ${bundle.categoryContext.currentCategory.fullPath}`,
            ].join(' '),
            images,
          };
        };
      }

      if (type === 'model') {
        return async ({ nodeInputs }) => {
          const result = await enqueueModelJob({
            prompt: String(nodeInputs['prompt'] ?? ''),
            images: ((nodeInputs['images'] ?? []) as unknown[]).map((value) => String(value)),
          });
          return result;
        };
      }

      if (type === 'regex') {
        return async ({ nodeInputs }) => {
          const rawValue = String(nodeInputs['value'] ?? '');
          const normalized = rawValue.replace(/\s+/g, ' ').trim();
          return {
            value: normalized,
            matches: [normalized],
            grouped: {
              normalized,
            },
          };
        };
      }

      if (type === 'mapper') {
        return async ({ nodeInputs }) => {
          const normalizedName = String(nodeInputs['value'] ?? '');
          return {
            result: {
              normalizedName,
              categoryLabel: 'Dresses',
            },
            value: normalizedName,
            bundle: {
              normalizedName,
              categoryLabel: 'Dresses',
              title: normalizedName,
            },
          };
        };
      }

      if (type === 'database') {
        return async ({ nodeInputs }) => ({
          result: {
            updated: true,
            entityId: nodeInputs['entityId'],
            entityType: nodeInputs['entityType'],
          },
          bundle: nodeInputs['bundle'],
          content_en: 'unchanged',
          aiPrompt: 'dry-run update',
        });
      }

      if (type === 'viewer') {
        return async ({ nodeInputs }) => ({
          normalizedName: nodeInputs['value'],
          persisted: (nodeInputs['meta'] as { updated?: boolean } | undefined)?.updated ?? false,
          bundle: nodeInputs['bundle'],
          result: nodeInputs['result'],
        });
      }

      return null;
    };

    const findNodeIdByType = (type: string): string => {
      const node = nodes.find((n) => n.type === type);
      if (!node) throw new Error(`Missing node of type ${type}`);
      return node.id;
    };

    const triggerNodeId = findNodeIdByType('trigger');
    const fetcherNodeId = findNodeIdByType('fetcher');
    const parserNodeId = findNodeIdByType('parser');
    const dbSchemaNodeId = findNodeIdByType('db_schema');
    const categoryContextNodeId = findNodeIdByType('function');
    const promptNodeId = findNodeIdByType('prompt');
    const modelNodeId = findNodeIdByType('model');
    const regexNodeId = findNodeIdByType('regex');
    const mapperNodeId = findNodeIdByType('mapper');
    const updateNodeId = findNodeIdByType('database');
    const viewNodeId = findNodeIdByType('viewer');

    const runtime = await evaluateGraphInternal(nodes, edges, {
      triggerNodeId,
      triggerContext: {
        entityId: 'product-1',
        entityType: 'product',
      },
      maxIterations: 16,
      fetchEntityCached,
      resolveHandler,
      onNodeFinish: ({ node, nodeInputs }) => {
        finishedOrder.push(node.id);
        seenInputs.set(node.id, clonePorts(nodeInputs));
      },
      reportAiPathsError: (): void => {},
    });

    expect(runtime.status).toBe('completed');
    expect(fetchEntityCached).toHaveBeenCalledTimes(1);
    expect(enqueueModelJob).toHaveBeenCalledTimes(1);

    expect(finishedOrder).toEqual([
      triggerNodeId,
      fetcherNodeId,
      parserNodeId,
      dbSchemaNodeId,
      categoryContextNodeId,
      promptNodeId,
      modelNodeId,
      regexNodeId,
      mapperNodeId,
      updateNodeId,
      viewNodeId,
    ]);

    expect(seenInputs.get(parserNodeId)).toEqual(
      expect.objectContaining({
        context: productEntity,
      })
    );
    expect(seenInputs.get(promptNodeId)).toEqual(
      expect.objectContaining({
        bundle: expect.objectContaining({
          title: 'summer floral maxi dress',
          categoryContext: expect.objectContaining({
            currentCategory: expect.objectContaining({
              fullPath: 'Women > Dresses',
            }),
          }),
        }),
        images: [
          'https://cdn.example.com/image-1.jpg',
          'https://cdn.example.com/image-2.jpg',
        ],
      })
    );
    expect(seenInputs.get(updateNodeId)).toEqual(
      expect.objectContaining({
        entityId: 'product-1',
        entityType: 'product',
        result: expect.objectContaining({
          normalizedName: 'Floral Maxi Dress',
        }),
      })
    );
    expect(runtime.nodeOutputs[viewNodeId]).toEqual(
      expect.objectContaining({
        normalizedName: 'Floral Maxi Dress',
        persisted: true,
        result: expect.objectContaining({
          normalizedName: 'Floral Maxi Dress',
          categoryLabel: 'Dresses',
        }),
      })
    );
  });
});
