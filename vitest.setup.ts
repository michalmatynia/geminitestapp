import "dotenv/config";
import "@testing-library/jest-dom";
import { vi, beforeAll, afterEach, afterAll } from "vitest";
import React from "react";
import { server } from "./src/mocks/server";

// Force Prisma as the database provider for tests to ensure consistency with cleanup logic
process.env.APP_DB_PROVIDER = "prisma";
delete process.env.MONGODB_URI;

vi.mock("@/shared/lib/db/app-db-provider", () => ({
  getAppDbProvider: vi.fn().mockResolvedValue("prisma"),
  getAppDbProviderSetting: vi.fn().mockResolvedValue("prisma"),
  APP_DB_PROVIDER_SETTING_KEY: "app_db_provider",
}));

// Mock Prisma client for all tests
vi.mock("@/shared/lib/db/prisma", () => {
  // Create a mock Prisma client with all models
  const mockPrismaClient = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),

    // Product model
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-product-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        catalogs: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id || `mock-product-${Date.now()}`,
        ...args?.create,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 } }),
    },

    // ProductImage model
    productImage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        productId: args?.data?.productId,
        imageFileId: args?.data?.imageFileId,
        assignedAt: new Date(),
      })),
      createMany: vi.fn().mockImplementation((args) => ({
        count: args?.data?.length || 0,
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ImageFile model
    imageFile: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-image-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Catalog model
    catalog: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-catalog-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        products: [],
        languages: [],
        categories: [],
        tags: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // ProductCatalog model (join table)
    productCatalog: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        productId: args?.data?.productId,
        catalogId: args?.data?.catalogId,
        assignedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductCategory model
    productCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-category-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
        products: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // ProductCategoryAssignment model (join table)
    productCategoryAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        productId: args?.data?.productId,
        categoryId: args?.data?.categoryId,
        assignedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductTag model
    productTag: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-tag-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        products: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // ProductTagAssignment model (join table)
    productTagAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        productId: args?.data?.productId,
        tagId: args?.data?.tagId,
        assignedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AiPathRun model
    aiPathRun: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-ai-path-run-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AiPathRunNode model
    aiPathRunNode: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-ai-path-run-node-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      upsert: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id || `mock-node-${Date.now()}`,
        ...args?.update,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AiPathRunEvent model
    aiPathRunEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-event-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // SystemLog model
    systemLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-log-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 } }),
      groupBy: vi.fn().mockResolvedValue([]),
    },

    // CMS Page model
    page: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-page-${Date.now()}`,
        ...args?.data,
        status: args?.data?.status || "draft",
        publishedAt: args?.data?.publishedAt || null,
        seoTitle: args?.data?.seoTitle || null,
        seoDescription: args?.data?.seoDescription || null,
        seoOgImage: args?.data?.seoOgImage || null,
        seoCanonical: args?.data?.seoCanonical || null,
        robotsMeta: args?.data?.robotsMeta || "index,follow",
        showMenu: args?.data?.showMenu ?? true,
        themeId: args?.data?.themeId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        slugs: [],
        components: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // CMS Slug model
    slug: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-slug-${Date.now()}`,
        ...args?.data,
        isDefault: args?.data?.isDefault ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
        pages: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // CMS Theme model
    cmsTheme: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-theme-${Date.now()}`,
        ...args?.data,
        customCss: args?.data?.customCss || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        pages: [],
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // PageSlug join table
    pageSlug: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        pageId: args?.data?.pageId,
        slugId: args?.data?.slugId,
        assignedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // PageComponent model
    pageComponent: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-component-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id,
        ...args?.data,
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    $transaction: vi
      .fn()
      .mockImplementation((callback) => callback(mockPrismaClient)),
  };

  return {
    default: mockPrismaClient,
  };
});

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string }) => {
    return React.createElement("img", { alt: props.alt ?? "" });
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill for global.crypto.randomUUID if missing (for JSDOM)
if (!global.crypto) {
  // @ts-expect-error - crypto is read-only in some environments
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  // @ts-expect-error - polyfill for randomUUID
  global.crypto.randomUUID = () => "mock-random-uuid";
}

// Polyfill for window.matchMedia (GSAP needs this)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * MSW Server Setup for Vitest
 * Establishes request mocking for all tests
 */
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: "error",
  });
});

afterEach(() => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
});

afterAll(() => {
  // Clean up and stop the server after all tests complete
  server.close();
});
