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
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        productId: args?.data?.productId,
        imageFileId: args?.data?.imageFileId,
        assignedAt: new Date(),
      })),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
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

    // Page model (CMS)
    page: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-page-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // Note model
    note: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-note-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
    },

    // Category model
    category: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-category-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      aggregate: vi.fn().mockResolvedValue({ _count: { id: 0 } }),
    },

    // Tag model
    tag: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-tag-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Notebook model
    notebook: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-notebook-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Theme model
    theme: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-theme-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // NoteTag model
    noteTag: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // NoteCategory model
    noteCategory: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // NoteRelation model
    noteRelation: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Slug model
    slug: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-slug-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
    },

    // CmsTheme model
    cmsTheme: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-cms-theme-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // PageSlug model
    pageSlug: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // PageComponent model
    pageComponent: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-page-component-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
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
    },

    $transaction: vi.fn().mockImplementation((callback) => callback(mockPrismaClient)),
  };

  return {
    default: mockPrismaClient,
  };
});ount: 0 }),
    },

    // Asset3D model
    asset3D: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-asset3d-${Date.now()}`,
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
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-catalog-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Language model
    language: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-language-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Country model
    country: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-country-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Currency model
    currency: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-currency-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // PriceGroup model
    priceGroup: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-price-group-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // Integration model
    integration: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-integration-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // IntegrationConnection model
    integrationConnection: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-connection-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // ProductListing model
    productListing: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-listing-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductCatalog model
    productCatalog: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductCategory model
    productCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-product-category-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
    },

    // ProductCategoryAssignment model
    productCategoryAssignment: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductTag model
    productTag: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-product-tag-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },

    // ProductTagAssignment model
    productTagAssignment: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductParameter model
    productParameter: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-parameter-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },

    // CatalogLanguage model
    catalogLanguage: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // LanguageCountry model
    languageCountry: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // CountryCurrency model
    countryCurrency: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ChatbotSession model
    chatbotSession: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-session-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // ChatbotMessage model
    chatbotMessage: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-message-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
    },

    // ChatbotJob model
    chatbotJob: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-job-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
    },

    // ChatbotAgentRun model
    chatbotAgentRun: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-agent-run-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AgentMemoryItem model
    agentMemoryItem: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-memory-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AgentLongTermMemory model
    agentLongTermMemory: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-ltm-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AgentAuditLog model
    agentAuditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-audit-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AgentBrowserSnapshot model
    agentBrowserSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-snapshot-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // AgentBrowserLog model
    agentBrowserLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-browser-log-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ProductAiJob model
    productAiJob: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-ai-job-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
    },

    // ProductDraft model
    productDraft: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-draft-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // ExternalCategory model
    externalCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-external-category-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // CategoryMapping model
    categoryMapping: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-mapping-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Setting model
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-setting-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockImplementation((args) => ({
        id: args?.where?.key || `mock-setting-${Date.now()}`,
        ...args?.update,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
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
    },

    // ChatbotSettings model
    chatbotSettings: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-chatbot-settings-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id || `mock-chatbot-settings-${Date.now()}`,
        ...args?.update,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },

    // User model
    user: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-user-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },

    // UserPreferences model
    userPreferences: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-prefs-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      upsert: vi.fn().mockImplementation((args) => ({
        id: args?.where?.id || `mock-prefs-${Date.now()}`,
        ...args?.update,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },

    // AuthSecurityProfile model
    authSecurityProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-security-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn().mockResolvedValue({}),
    },

    // Account model
    account: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // Session model
    session: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    // VerificationToken model
    verificationToken: {
      findUnique: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
    },

    // NoteFile model
    noteFile: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((args) => ({
        id: `mock-note-file-${Date.now()}`,
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };

  return {
    default: mockPrismaClient,
    __esModule: true,
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
