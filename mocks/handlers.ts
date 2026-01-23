import { http, HttpResponse } from 'msw';

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

const mockSettings = [
  { key: 'SITE_NAME', value: 'My Store' },
  { key: 'SITE_DESCRIPTION', value: 'Test Description' },
];

/**
 * MSW Handlers for API mocking
 * Define all mock API responses here
 */
export const handlers = [
  // Products endpoints
  http.get('/api/products', () => {
    return HttpResponse.json({
      data: mockProducts,
      total: mockProducts.length,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  }),

  http.get('/api/products/:id', ({ params }) => {
    const product = mockProducts.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json(product) as any;
  }),

  http.post('/api/products', async ({ request }) => {
    const body = await request.json();
    const newProduct = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.put('/api/products/:id', async ({ params, request }) => {
    const product = mockProducts.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    const body = await request.json();
    const updatedProduct = {
      ...product,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updatedProduct);
  }),

  http.delete('/api/products/:id', ({ params }) => {
    const product = mockProducts.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true }) as any;
  }),

  // Catalogs endpoints
  http.get('/api/catalogs', () => {
    return HttpResponse.json({
      data: mockCatalogs,
      total: mockCatalogs.length,
    });
  }),

  http.get('/api/catalogs/:id', ({ params }) => {
    const catalog = mockCatalogs.find((c) => c.id === params.id);
    if (!catalog) {
      return HttpResponse.json({ error: 'Catalog not found' }, { status: 404 });
    }
    return HttpResponse.json(catalog) as any;
  }),

  // Settings endpoints
  http.get('/api/settings', () => {
    return HttpResponse.json({
      data: mockSettings,
    });
  }),

  http.get('/api/settings/:key', ({ params }) => {
    const setting = mockSettings.find((s) => s.key === params.key);
    if (!setting) {
      return HttpResponse.json({ error: 'Setting not found' }, { status: 404 });
    }
    return HttpResponse.json(setting) as any;
  }),

  http.post('/api/settings', async ({ request }) => {
    const body = await request.json();
    const newSetting = {
      ...body,
    };
    return HttpResponse.json(newSetting, { status: 201 });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }),
];
