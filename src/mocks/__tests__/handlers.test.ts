import { describe, it, expect } from 'vitest';
import { server } from '../server';
import { http, HttpResponse } from 'msw';

describe('MSW Handlers', () => {
  describe('Products API', () => {
    it('should fetch all products', async () => {
      const response = await fetch('/api/products');
      const data = (await response.json()) as { data: Record<string, unknown>[]; total: number };

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.total).toBe(2);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should fetch all products', async () => {
      const response = await fetch('/api/products');
      const data = (await response.json()) as { data: Record<string, unknown>[]; total: number };

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.total).toBe(2);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should fetch a single product by id', async () => {
      const response = await fetch('/api/products/1');
      const data = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.name_en).toBe('Sample Product 1');
      expect(data.sku).toBe('SKU-001');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await fetch('/api/products/999');

      expect(response.status).toBe(404);
    });

    it('should create a new product', async () => {
      const newProduct = {
        name_en: 'New Product',
        name_pl: 'Nowy Produkt',
        name_de: 'Neues Produkt',
        sku: 'SKU-NEW',
        price: 99.99,
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      expect(response.status).toBe(201);
      const data = (await response.json()) as Record<string, any>;
      expect(data.name_en).toBe('New Product');
      expect(data.id).toBeDefined();
    });

    it('should update a product', async () => {
      const updates = {
        name_en: 'Updated Product',
        price: 39.99,
      };

      const response = await fetch('/api/products/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as Record<string, any>;
      expect(data.name_en).toBe('Updated Product');
      expect(data.price).toBe(39.99);
    });

    it('should delete a product', async () => {
      const response = await fetch('/api/products/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as Record<string, any>;
      expect(data.success).toBe(true);
    });
  });

  describe('Catalogs API', () => {
    it('should fetch all catalogs', async () => {
      const response = await fetch('/api/catalogs');
      const data = (await response.json()) as { data: any[]; total: number };

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(data.total).toBe(2);
    });

    it('should fetch a single catalog', async () => {
      const response = await fetch('/api/catalogs/1');
      const data = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.name).toBe('Main Catalog');
    });
  });

  describe('Settings API', () => {
    it('should fetch all settings', async () => {
      const response = await fetch('/api/settings');
      const data = (await response.json()) as { data: any[] };

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should fetch a single setting', async () => {
      const response = await fetch('/api/settings/SITE_NAME');
      const data = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(data.key).toBe('SITE_NAME');
      expect(data.value).toBe('My Store');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch('/api/health');
      const data = (await response.json()) as Record<string, any>;

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Handler Override', () => {
    it('should allow overriding handlers in tests', async () => {
      // Override the products handler for this specific test
      server.use(
        http.get('/api/products', () => {
          return HttpResponse.json({
            data: [{ id: 'test', name_en: 'Test Override' }],
            total: 1,
          });
        })
      );

      const response = await fetch('/api/products');
      const data = (await response.json()) as { data: Record<string, unknown>[] };

      expect((data.data[0] as Record<string, unknown>).name_en).toBe('Test Override');
    });
  });
});
