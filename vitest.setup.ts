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
  // Helper to create a basic mock model
  const createMockModel = (name: string) => ({
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((args) => ({
      id: `mock-${name}-${Date.now()}`,
      ...args?.data,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      id: args?.where?.id || `mock-${name}-${Date.now()}`,
      ...args?.create,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 }, _sum: {}, _min: {}, _max: {}, _avg: {} }),
    groupBy: vi.fn().mockResolvedValue([]),
  });

  const mockPrismaClient = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') return callback(mockPrismaClient);
      return Promise.resolve(callback);
    }),

    product: {
      ...createMockModel("product"),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-product-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        catalogs: [],
        categories: [],
        tags: [],
      })),
    },
    productImage: createMockModel("productImage"),
    imageFile: createMockModel("imageFile"),
    catalog: {
      ...createMockModel("catalog"),
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
    },
    productCatalog: createMockModel("productCatalog"),
    productCategory: createMockModel("productCategory"),
    productCategoryAssignment: createMockModel("productCategoryAssignment"),
    productTag: createMockModel("productTag"),
    productTagAssignment: createMockModel("productTagAssignment"),
    aiPathRun: createMockModel("aiPathRun"),
    aiPathRunNode: createMockModel("aiPathRunNode"),
    aiPathRunEvent: createMockModel("aiPathRunEvent"),
    systemLog: createMockModel("systemLog"),
    page: createMockModel("page"),
    slug: createMockModel("slug"),
    cmsTheme: createMockModel("cmsTheme"),
    pageSlug: createMockModel("pageSlug"),
    pageComponent: createMockModel("pageComponent"),
    
    // Notes models
    note: {
      ...createMockModel("note"),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-note-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        categories: [],
        files: [],
        relationsFrom: [],
        relationsTo: [],
      })),
    },
    notebook: createMockModel("notebook"),
    tag: createMockModel("tag"),
    category: createMockModel("category"),
    theme: createMockModel("theme"),
    noteTag: createMockModel("noteTag"),
    noteCategory: createMockModel("noteCategory"),
    noteRelation: createMockModel("noteRelation"),
    
    // Auth models
    user: createMockModel("user"),
    account: createMockModel("account"),
    session: createMockModel("session"),
    userPreferences: createMockModel("userPreferences"),
    authSecurityProfile: createMockModel("authSecurityProfile"),
    verificationToken: createMockModel("verificationToken"),

    // Chatbot models
    chatbotSession: createMockModel("chatbotSession"),
    chatbotMessage: createMockModel("chatbotMessage"),
    chatbotJob: createMockModel("chatbotJob"),
    chatbotSettings: createMockModel("chatbotSettings"),
    chatbotAgentRun: createMockModel("chatbotAgentRun"),
    agentMemoryItem: createMockModel("agentMemoryItem"),
    agentLongTermMemory: createMockModel("agentLongTermMemory"),
    agentAuditLog: createMockModel("agentAuditLog"),
    agentBrowserSnapshot: createMockModel("agentBrowserSnapshot"),
    agentBrowserLog: createMockModel("agentBrowserLog"),

    // Price groups
    priceGroup: createMockModel("priceGroup"),
    currency: createMockModel("currency"),
    country: createMockModel("country"),
    language: createMockModel("language"),
    catalogLanguage: createMockModel("catalogLanguage"),
    languageCountry: createMockModel("languageCountry"),
    countryCurrency: createMockModel("countryCurrency"),
    externalCategory: createMockModel("externalCategory"),
    categoryMapping: createMockModel("categoryMapping"),
    asset3D: createMockModel("asset3D"),
    productDraft: createMockModel("productDraft"),
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