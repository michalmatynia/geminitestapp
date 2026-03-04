import { http, HttpResponse } from 'msw';

import { NoteCreateData } from '@/features/notesapp';

import type { PathParams } from 'msw';

type ParamsContext = { params: PathParams };
type RequestContext = { request: Request };
type RequestParamsContext = { params: PathParams; request: Request };

// Mock data
const mockProducts = [
  {
    id: '1',
    name_en: 'Sample Product 1',
    name_pl: 'Przykładowy Produkt 1',
    name_de: 'Beispielprodukt 1',
    description: 'A sample product for testing',
    sku: 'SKU-001',
    price: 29.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name_en: 'Sample Product 2',
    name_pl: 'Przykładowy Produkt 2',
    name_de: 'Beispielprodukt 2',
    description: 'Another sample product for testing',
    sku: 'SKU-002',
    price: 49.99,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCatalogs = [
  { id: '1', name: 'Main Catalog', description: 'Main product catalog' },
  { id: '2', name: 'Sale Catalog', description: 'Sale products catalog' },
];

const mockAsset3dCategories = [{ id: 'furniture', name: 'Furniture' }];
const mockAsset3dTags = [{ id: 'wood', name: 'Wood' }];

const mockSettings = [
  { key: 'SITE_NAME', value: 'My Store' },
  { key: 'SITE_DESCRIPTION', value: 'Test Description' },
];

const now = new Date().toISOString();

const mockTags = [
  {
    id: 'tag-1',
    name: 'Work',
    color: '#3b82f6',
    notebookId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Projects',
    description: null,
    color: '#10b981',
    parentId: null,
    notebookId: null,
    themeId: null,
    createdAt: now,
    updatedAt: now,
  },
];

const mockNotebooks = [
  {
    id: 'notebook-1',
    name: 'Default',
    color: '#3b82f6',
    createdAt: now,
    updatedAt: now,
  },
];

const mockNotes = [
  {
    id: 'note-1',
    title: 'Alpha',
    content: 'First note',
    color: '#ffffff',
    editorType: 'markdown',
    isPinned: true,
    isArchived: false,
    isFavorite: false,
    notebookId: null,
    createdAt: now,
    updatedAt: now,
    tags: [
      {
        noteId: 'note-1',
        tagId: 'tag-1',
        assignedAt: now,
        tag: mockTags[0],
      },
    ],
    categories: [
      {
        noteId: 'note-1',
        categoryId: 'cat-1',
        assignedAt: now,
        category: mockCategories[0],
      },
    ],
    relationsFrom: [],
    relationsTo: [],
    relations: [],
  },
  {
    id: 'note-2',
    title: 'Beta',
    content: 'Second note',
    color: '#ffffff',
    editorType: 'markdown',
    isPinned: false,
    isArchived: false,
    isFavorite: false,
    notebookId: null,
    createdAt: now,
    updatedAt: now,
    tags: [],
    categories: [],
    relationsFrom: [],
    relationsTo: [],
    relations: [],
  },
];

/**
 * MSW Handlers for API mocking
 * Define all mock API responses here
 */
export const handlers = [
  // Products endpoints
  http.get('/api/v2/products', () => {
    return HttpResponse.json(mockProducts);
  }),

  http.get('/api/v2/products/count', () => {
    return HttpResponse.json({ count: mockProducts.length });
  }),

  http.get('/api/v2/products/:id', ({ params }: ParamsContext) => {
    const product = mockProducts.find((p: (typeof mockProducts)[number]) => p.id === params['id']);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json(product);
  }),

  http.get('/api/v2/products/:id/studio', () => {
    return HttpResponse.json({
      config: {
        projectId: null,
      },
    });
  }),

  http.get('/api/v2/products/categories/tree', () => {
    return HttpResponse.json([]);
  }),

  http.post('/api/v2/products', async ({ request }: RequestContext) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newProduct = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.put('/api/v2/products/:id', async ({ params, request }: RequestParamsContext) => {
    const product = mockProducts.find((p: (typeof mockProducts)[number]) => p.id === params['id']);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const updatedProduct = {
      ...product,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updatedProduct);
  }),

  http.delete('/api/v2/products/:id', ({ params }: ParamsContext) => {
    const product = mockProducts.find((p: (typeof mockProducts)[number]) => p.id === params['id']);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Catalogs endpoints
  http.get('/api/catalogs', () => {
    return HttpResponse.json(mockCatalogs);
  }),

  http.get('/api/catalogs/:id', ({ params }: ParamsContext) => {
    const catalog = mockCatalogs.find((c: (typeof mockCatalogs)[number]) => c.id === params['id']);
    if (!catalog) {
      return HttpResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }
    return HttpResponse.json(catalog);
  }),

  // Settings endpoints
  http.get('/api/settings', () => {
    return HttpResponse.json(mockSettings);
  }),

  http.get('/api/settings/:key', ({ params }: ParamsContext) => {
    const setting = mockSettings.find(
      (s: (typeof mockSettings)[number]) => s.key === params['key']
    );
    if (!setting) {
      return HttpResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    return HttpResponse.json(setting);
  }),

  http.post('/api/settings', async ({ request }: RequestContext) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newSetting = {
      ...body,
    };
    return HttpResponse.json(newSetting, { status: 201 });
  }),

  // Notes endpoints
  http.get('/api/notes', ({ request }: RequestContext) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const isPinned = url.searchParams.get('isPinned');
    const isArchived = url.searchParams.get('isArchived');

    let filtered = [...mockNotes];
    if (search) {
      filtered = filtered.filter(
        (n: (typeof mockNotes)[number]) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (isPinned !== null && isPinned !== undefined) {
      filtered = filtered.filter(
        (n: (typeof mockNotes)[number]) => String(n.isPinned) === isPinned
      );
    }
    if (isArchived !== null && isArchived !== undefined) {
      filtered = filtered.filter(
        (n: (typeof mockNotes)[number]) => String(n.isArchived) === isArchived
      );
    }

    return HttpResponse.json(filtered);
  }),

  http.post('/api/notes', async ({ request }: RequestContext) => {
    const body = (await request.json()) as NoteCreateData;
    const newNote = {
      id: `note-${mockNotes.length + 1}`,
      title: body.title || 'Untitled',
      content: body.content || '',
      color: body.color || '#ffffff',
      editorType: body.editorType || 'markdown',
      isPinned: body.isPinned || false,
      isArchived: body.isArchived || false,
      isFavorite: body.isFavorite || false,
      notebookId: body.notebookId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      categories: [],
      relationsFrom: [],
      relationsTo: [],
      relations: [],
    };
    return HttpResponse.json(newNote, { status: 201 });
  }),

  http.get('/api/notes/tags', () => {
    return HttpResponse.json(mockTags);
  }),

  http.get('/api/notes/notebooks', () => {
    return HttpResponse.json(mockNotebooks);
  }),

  http.get('/api/notes/categories/tree', () => {
    const tree = mockCategories.map((category: (typeof mockCategories)[number]) => ({
      ...category,
      children: [],
      notes: mockNotes
        .filter((note: (typeof mockNotes)[number]) =>
          note.categories.some(
            (cat: (typeof mockNotes)[number]['categories'][number]) =>
              cat.categoryId === category.id
          )
        )
        .map((note: (typeof mockNotes)[number]) => ({
          id: note.id,
          title: note.title,
          content: note.content,
          color: note.color,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        })),
    }));
    return HttpResponse.json(tree);
  }),

  // Price groups (canonical + legacy compatibility)
  http.get('/api/v2/products/metadata/price-groups', () => {
    return HttpResponse.json([
      {
        id: 'pg-1',
        groupId: 'default',
        name: 'Default Price Group',
        currencyId: 'curr-1',
        currency: { id: 'curr-1', code: 'USD', name: 'US Dollar' },
        isDefault: true,
      },
    ]);
  }),
  http.get('/api/price-groups', () => {
    return HttpResponse.json([
      {
        id: 'pg-1',
        groupId: 'default',
        name: 'Default Price Group',
        currencyId: 'curr-1',
        currency: { id: 'curr-1', code: 'USD', name: 'US Dollar' },
        isDefault: true,
      },
    ]);
  }),

  // Languages (canonical + legacy compatibility)
  http.get('/api/v2/metadata/languages', () => {
    return HttpResponse.json([
      { id: 'lang-1', code: 'EN', name: 'English' },
      { id: 'lang-2', code: 'PL', name: 'Polish' },
    ]);
  }),
  http.get('/api/languages', () => {
    return HttpResponse.json([
      { id: 'lang-1', code: 'EN', name: 'English' },
      { id: 'lang-2', code: 'PL', name: 'Polish' },
    ]);
  }),

  // Currencies (canonical + legacy compatibility)
  http.get('/api/v2/metadata/currencies', () => {
    return HttpResponse.json([
      { id: 'curr-1', code: 'USD', name: 'US Dollar' },
      { id: 'curr-2', code: 'PLN', name: 'Polish Zloty' },
    ]);
  }),
  http.get('/api/currencies', () => {
    return HttpResponse.json([
      { id: 'curr-1', code: 'USD', name: 'US Dollar' },
      { id: 'curr-2', code: 'PLN', name: 'Polish Zloty' },
    ]);
  }),

  // User preferences
  http.get('/api/user/preferences', () => {
    return HttpResponse.json({
      productListNameLocale: 'name_en',
      productListCurrencyCode: 'USD',
      productListThumbnailSource: 'file',
      productListFiltersCollapsedByDefault: false,
      cmsLastPageId: null,
      cmsThemeOpenSections: [],
      cmsThemeLogoWidth: null,
      cmsThemeLogoUrl: null,
    });
  }),

  // Drafts
  http.get('/api/drafts', () => {
    return HttpResponse.json([]);
  }),

  // Product listings integrations
  http.get('/api/integrations/product-listings', () => {
    return HttpResponse.json({});
  }),
  http.post('/api/integrations/product-listings', () => {
    return HttpResponse.json({});
  }),

  http.get('/api/integrations/queues/tradera', () => {
    return HttpResponse.json({
      ok: true,
      mode: 'inline',
      redisAvailable: false,
      timestamp: new Date().toISOString(),
      queues: {
        listings: null,
        relistScheduler: null,
      },
    });
  }),

  // Observability endpoints
  http.post('/api/query-telemetry', () => {
    return HttpResponse.json({ accepted: true });
  }),

  http.post('/api/client-errors', () => {
    return HttpResponse.json({ accepted: true });
  }),

  // AI paths settings
  http.get('/api/ai-paths/settings', () => {
    return HttpResponse.json([]);
  }),

  // 3D assets
  http.get('/api/assets3d', () => {
    return HttpResponse.json([]);
  }),

  http.get('/api/assets3d/categories', () => {
    return HttpResponse.json(mockAsset3dCategories);
  }),

  http.get('/api/assets3d/tags', () => {
    return HttpResponse.json(mockAsset3dTags);
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),

  http.post('/api/integrations/products/:id/base/sku-check', () => {
    return HttpResponse.json({ exists: false });
  }),
];
