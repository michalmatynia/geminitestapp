import { beforeEach, expect, it, vi } from 'vitest';

type QueryDescriptor = {
  queryFn: () => Promise<unknown>;
};

type CreateMultiQueryInput = {
  queries: QueryDescriptor[];
};

type CreateMultiQuery = (input: CreateMultiQueryInput) => [];
type ApiGetMock = (
  url: string,
  options?: { params?: Record<string, string> | undefined; cache?: string }
) => Promise<[]>;

const mocks = vi.hoisted(() => ({
  apiGetMock: vi.fn<ApiGetMock>().mockResolvedValue([]),
  useMultiQueryV2Mock: vi.fn<CreateMultiQuery>(() => []),
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
    get: (...args: Parameters<ApiGetMock>) => mocks.apiGetMock(...args),
  },
}));

vi.mock('@/shared/lib/query-factories-v2', () => ({
  useMultiQueryV2: (input: CreateMultiQueryInput) =>
    mocks.useMultiQueryV2Mock(input),
}));

import { useDraftMetadata } from './useDraftMetadata';

const readCreateMultiQueryInput = (callIndex: number): CreateMultiQueryInput => {
  const call = mocks.useMultiQueryV2Mock.mock.calls[callIndex];
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
  await readCreateMultiQueryInput(3).queries[0]?.queryFn();

  expect(mocks.getCategoriesFlatMock).toHaveBeenCalledWith('catalog-mentios');
  expect(mocks.getTagsMock).toHaveBeenCalledWith('catalog-battlestock');
  expect(mocks.getParametersMock).toHaveBeenCalledWith(null);
  expect(mocks.apiGetMock).toHaveBeenCalledWith('/api/v2/products/simple-parameters', {
    params: undefined,
    cache: 'no-store',
  });
});
