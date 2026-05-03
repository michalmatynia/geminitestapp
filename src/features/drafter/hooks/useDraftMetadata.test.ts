import { beforeEach, expect, it, vi } from 'vitest';

type QueryDescriptor = {
  queryFn: () => Promise<unknown>;
};

type CreateMultiQueryInput = {
  queries: QueryDescriptor[];
};

type CreateMultiQuery = (input: CreateMultiQueryInput) => [];

const mocks = vi.hoisted(() => ({
  apiGetMock: vi.fn<() => Promise<[]>>().mockResolvedValue([]),
  createMultiQueryV2Mock: vi.fn<CreateMultiQuery>(() => []),
  getCategoriesFlatMock: vi.fn<(catalogId: string | null) => Promise<[]>>()
    .mockResolvedValue([]),
  getParametersMock: vi.fn<(catalogId: string | null) => Promise<[]>>()
    .mockResolvedValue([]),
  getTagsMock: vi.fn<(catalogId: string | null) => Promise<[]>>()
    .mockResolvedValue([]),
}));

vi.mock('@/features/products/forms.public', () => ({
  getCategoriesFlat: (catalogId: string | null) =>
    mocks.getCategoriesFlatMock(catalogId),
  getParameters: (catalogId: string | null) =>
    mocks.getParametersMock(catalogId),
  getTags: (catalogId: string | null) => mocks.getTagsMock(catalogId),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: () => mocks.apiGetMock(),
  },
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createMultiQueryV2: (input: CreateMultiQueryInput) =>
    mocks.createMultiQueryV2Mock(input),
}));

import { useDraftMetadata } from './useDraftMetadata';

const readCreateMultiQueryInput = (callIndex: number): CreateMultiQueryInput => {
  const call = mocks.createMultiQueryV2Mock.mock.calls[callIndex];
  if (call === undefined) throw new Error(`Missing query call ${callIndex}`);
  return call[0];
};

beforeEach(() => {
  vi.clearAllMocks();
});

it('loads categories from the category tree catalog independently of product catalogs', async () => {
  useDraftMetadata(['catalog-battlestock'], ['catalog-mentios']);

  await readCreateMultiQueryInput(0).queries[0]?.queryFn();
  await readCreateMultiQueryInput(1).queries[0]?.queryFn();
  await readCreateMultiQueryInput(2).queries[0]?.queryFn();

  expect(mocks.getCategoriesFlatMock).toHaveBeenCalledWith('catalog-mentios');
  expect(mocks.getTagsMock).toHaveBeenCalledWith('catalog-battlestock');
  expect(mocks.getParametersMock).toHaveBeenCalledWith('catalog-battlestock');
});
