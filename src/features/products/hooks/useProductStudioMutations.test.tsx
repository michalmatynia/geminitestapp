// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ProductStudioProductResponse,
  ProductStudioSendResponse,
} from '@/shared/contracts/products';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const mocks = vi.hoisted(() => ({
  postMock: vi.fn(),
  invalidateImageStudioSlotsMock: vi.fn(),
  invalidateProductsAndCountsMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => mocks.postMock(...args),
    put: vi.fn(),
    patch: vi.fn(),
    patchFormData: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./productCache', () => ({
  invalidateImageStudioSlots: (...args: unknown[]) => mocks.invalidateImageStudioSlotsMock(...args),
  invalidateProductsAndCounts: (...args: unknown[]) =>
    mocks.invalidateProductsAndCountsMock(...args),
}));

import {
  useAcceptVariantMutation,
  useRotateImageSlotMutation,
  useSendToStudioMutation,
} from './useProductStudioMutations';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: {
      en: 'Product 1',
      pl: null,
      de: null,
    },
    description: {
      en: null,
      pl: null,
      de: null,
    },
    categoryId: null,
    catalogId: 'catalog-1',
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    name_fr: null,
    name_sv: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    description_fr: null,
    description_sv: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    price: 10,
    stock: 5,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    shippingGroupId: null,
    producers: [],
    images: [],
    imageLinks: [],
    imageBase64s: [],
    parameters: [],
    tags: [],
    catalogs: [],
    customFields: [],
    marketplaceContentOverrides: [],
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

const createSlot = () => ({
  id: 'slot-1',
  projectId: 'project-1',
  name: null,
  folderPath: null,
  createdAt: '2026-04-09T00:00:00.000Z',
  updatedAt: '2026-04-09T00:00:00.000Z',
});

const createSendResponse = (): ProductStudioSendResponse => ({
  config: {
    projectId: 'project-1',
    sourceSlotByImageIndex: {},
    sourceSlotHistoryByImageIndex: {},
    updatedAt: '2026-04-09T00:00:00.000Z',
  },
  sequencing: {
    persistedEnabled: false,
    enabled: false,
    cropCenterBeforeGeneration: false,
    upscaleOnAccept: false,
    upscaleScale: 2,
    runViaSequence: false,
    sequenceStepCount: 0,
    expectedOutputs: 1,
    snapshotHash: null,
    snapshotSavedAt: null,
    snapshotStepCount: 0,
    snapshotModelId: null,
    currentSnapshotHash: null,
    snapshotMatchesCurrent: false,
    needsSaveDefaults: false,
    needsSaveDefaultsReason: null,
  },
  sequencingDiagnostics: {
    projectId: 'project-1',
    projectSettingsKey: null,
    selectedSettingsKey: null,
    selectedScope: 'default',
    hasProjectSettings: false,
    hasGlobalSettings: false,
    projectSequencingEnabled: false,
    globalSequencingEnabled: false,
    selectedSequencingEnabled: false,
    selectedSnapshotHash: null,
    selectedSnapshotSavedAt: null,
    selectedSnapshotStepCount: 0,
    selectedSnapshotModelId: null,
  },
  sequenceReadiness: {
    ready: true,
    requiresProjectSequence: false,
    state: 'ready',
    message: null,
  },
  sequenceStepPlan: [],
  projectId: 'project-1',
  imageSlotIndex: 0,
  sourceSlot: createSlot(),
  runId: 'run-1',
  runStatus: 'queued',
  expectedOutputs: 1,
  dispatchMode: 'queued',
  runKind: 'generation',
  sequenceRunId: null,
  requestedSequenceMode: 'auto',
  resolvedSequenceMode: 'auto',
  executionRoute: 'ai_direct_generation',
});

const createProductResponse = (): ProductStudioProductResponse => ({
  product: createProduct(),
});

describe('useProductStudioMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateImageStudioSlotsMock.mockResolvedValue(undefined);
    mocks.invalidateProductsAndCountsMock.mockResolvedValue(undefined);
  });

  it('sends a product image to studio and invalidates studio slots for the selected project', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const response = createSendResponse();
    mocks.postMock.mockResolvedValue(response);

    const { result } = renderHook(() => useSendToStudioMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        imageSlotIndex: 0,
        projectId: 'project-1',
      });
    });

    expect(mocks.postMock).toHaveBeenCalledWith('/api/v2/products/product-1/studio/send', {
      imageSlotIndex: 0,
      projectId: 'project-1',
    });
    expect(mocks.invalidateImageStudioSlotsMock).toHaveBeenCalledWith(queryClient, 'project-1');
  });

  it('accepts a studio variant and invalidates product list caches', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const response = createProductResponse();
    mocks.postMock.mockResolvedValue(response);

    const { result } = renderHook(() => useAcceptVariantMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        imageSlotIndex: 1,
        generationSlotId: 'variant-slot-1',
        projectId: 'project-1',
      });
    });

    expect(mocks.postMock).toHaveBeenCalledWith('/api/v2/products/product-1/studio/accept', {
      imageSlotIndex: 1,
      generationSlotId: 'variant-slot-1',
      projectId: 'project-1',
    });
    expect(mocks.invalidateProductsAndCountsMock).toHaveBeenCalledWith(queryClient);
  });

  it('rotates a product image slot and invalidates product list caches', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const response = createProductResponse();
    mocks.postMock.mockResolvedValue(response);

    const { result } = renderHook(() => useRotateImageSlotMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        imageSlotIndex: 2,
        direction: 'right',
      });
    });

    expect(mocks.postMock).toHaveBeenCalledWith('/api/v2/products/product-1/studio/rotate', {
      imageSlotIndex: 2,
      direction: 'right',
    });
    expect(mocks.invalidateProductsAndCountsMock).toHaveBeenCalledWith(queryClient);
  });
});
