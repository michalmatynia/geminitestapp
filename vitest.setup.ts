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

// Define model defaults to prevent "map of undefined" errors
const MODEL_DEFAULTS: Record<string, any> = {
  product: { images: [], catalogs: [], categories: [], tags: [] },
  note: { tags: [], categories: [], files: [], relationsFrom: [], relationsTo: [] },
  catalog: { products: [], languages: [], categories: [], tags: [] },
  page: { slugs: [], components: [] },
  language: { countries: [] },
  country: { languages: [], currencies: [] },
  category: { notes: [], children: [] },
  imageFile: { products: [] },
};

// Mock Prisma client for all tests with simple in-memory state
vi.mock("@/shared/lib/db/prisma", () => {
  let store = new Map<string, any[]>();

  const getStore = (name: string) => {
    if (!store.has(name)) {
      store.set(name, []);
    }
    return store.get(name)!;
  };

  const matches = (item: any, where: any): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR' && Array.isArray(value)) {
        return value.some(condition => matches(item, condition));
      }
      if (key === 'AND' && Array.isArray(value)) {
        return value.every(condition => matches(item, condition));
      }
      if (key === 'NOT') {
        return !matches(item, value);
      }

      // Handle compound keys or nested object matches
      if (typeof value === 'object' && value !== null && !('in' in value || 'notIn' in value || 'contains' in value || 'gte' in value || 'some' in value || 'none' in value || 'every' in value || 'lt' in value || 'lte' in value || 'gt' in value)) {
          const itemValue = item[key];
          if (typeof itemValue === 'object' && itemValue !== null) {
              return matches(itemValue, value);
          }
          return Object.entries(value).every(([vKey, vValue]) => item[vKey] === vValue);
      }

      if (value === null || value === undefined) return item[key] === value;
      
      // Handle { in: [...] }
      if (typeof value === 'object' && value !== null && 'in' in (value as any)) {
        return (value as any).in.includes(item[key]);
      }

      // Handle { notIn: [...] }
      if (typeof value === 'object' && value !== null && 'notIn' in (value as any)) {
        return !(value as any).notIn.includes(item[key]);
      }
      
      // Handle { contains: '...' } and { mode: 'insensitive' }
      if (typeof value === 'object' && value !== null && 'contains' in (value as any)) {
        const searchTerm = (value as any).contains;
        const mode = (value as any).mode;
        if (mode === 'insensitive') {
          return String(item[key] || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
        }
        return String(item[key] || '').includes(String(searchTerm || ''));
      }

      // Handle { gte, lte, gt, lt }
      if (typeof value === 'object' && value !== null) {
        const v = value as any;
        if ('gte' in v && !(item[key] >= v.gte)) return false;
        if ('lte' in v && !(item[key] <= v.lte)) return false;
        if ('gt' in v && !(item[key] > v.gt)) return false;
        if ('lt' in v && !(item[key] < v.lt)) return false;
        if (('gte' in v || 'lte' in v || 'gt' in v || 'lt' in v) && !('some' in v || 'none' in v || 'every' in v)) return true;
      }

      // Handle relation filters (some, none, every)
      if (typeof value === 'object' && value !== null) {
        const v = value as any;
        if ('some' in v) {
          const relationData = item[key] || [];
          return Array.isArray(relationData) && relationData.some(relItem => matches(relItem, v.some));
        }
        if ('none' in v) {
          const relationData = item[key] || [];
          return Array.isArray(relationData) && !relationData.some(relItem => matches(relItem, v.none));
        }
      }

      return item[key] === value;
    });
  };

  const applyInclude = (item: any, include: any, modelName: string) => {
      if (!include || !item) return item;
      const newItem = { ...item };
      
      Object.keys(include).forEach(key => {
          if (include[key]) {
              // Category.notes -> noteCategory -> note
              if (modelName === 'category' && key === 'notes') {
                  const junctionData = getStore('noteCategory').filter(nc => nc.categoryId === item.id);
                  newItem.notes = junctionData.map(junc => {
                      const note = getStore('note').find(n => n.id === junc.noteId);
                      const noteWithDefaults = { ...(MODEL_DEFAULTS['note'] || {}), ...note };
                      if (include.notes.include?.note?.include) {
                          return { ...junc, note: applyInclude(noteWithDefaults, include.notes.include.note.include, 'note') };
                      }
                      return { ...junc, note: noteWithDefaults };
                  });
                  return;
              }

              // Page.slugs -> pageSlug -> slug
              if (modelName === 'page' && key === 'slugs') {
                  const junctionData = getStore('pageSlug').filter(ps => ps.pageId === item.id);
                  newItem.slugs = junctionData.map(junc => {
                      const slug = getStore('slug').find(s => s.id === junc.slugId);
                      return { ...junc, slug: { ...(MODEL_DEFAULTS['slug'] || {}), ...slug } };
                  });
                  return;
              }

              // Note.categories -> noteCategory -> category
              if (modelName === 'note' && key === 'categories') {
                  const junctionData = getStore('noteCategory').filter(nc => nc.noteId === item.id);
                  newItem.categories = junctionData.map(junc => {
                      const category = getStore('category').find(c => c.id === junc.categoryId);
                      return { ...junc, category: { ...(MODEL_DEFAULTS['category'] || {}), ...category } };
                  });
                  return;
              }

              // General case
              const relatedStoreName = key;
              const fk = modelName + 'Id';
              if (store.has(relatedStoreName)) {
                  newItem[key] = getStore(relatedStoreName).filter(relItem => relItem[fk] === item.id);
              }
          }
      });
      return newItem;
  };

  // Helper to create a basic mock model with in-memory persistence
  const createMockModel = (name: string) => ({
    findMany: vi.fn().mockImplementation(async (args) => {
      let data = [...getStore(name)];
      if (args?.where) {
        data = data.filter(item => matches(item, args.where));
      }
      if (args?.orderBy) {
        const orderByArr = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
        data.sort((a, b) => {
          for (const order of orderByArr) {
            const [field, direction] = Object.entries(order)[0] as [string, string];
            if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
            if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      if (args?.skip) data = data.slice(args.skip);
      if (args?.take) data = data.slice(0, args.take);
      
      return data.map(item => {
          const withDefaults = { ...(MODEL_DEFAULTS[name] || {}), ...item };
          return applyInclude(withDefaults, args?.include, name);
      });
    }),
    findUnique: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      const item = data.find(item => matches(item, args.where)) || null;
      if (!item) return null;
      const withDefaults = { ...(MODEL_DEFAULTS[name] || {}), ...item };
      return applyInclude(withDefaults, args?.include, name);
    }),
    findFirst: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      let item;
      if (!args?.where) item = data[0];
      else item = data.find(item => matches(item, args.where));
      
      if (!item) return null;
      const withDefaults = { ...(MODEL_DEFAULTS[name] || {}), ...item };
      return applyInclude(withDefaults, args?.include, name);
    }),
    create: vi.fn().mockImplementation(async (args) => {
      const newItem = {
        id: args?.data?.id || `mock-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...(MODEL_DEFAULTS[name] || {}),
        ...args?.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Handle nested connects
      Object.entries(args?.data || {}).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'connect' in (value as any)) {
              newItem[key + 'Id'] = (value as any).connect.id;
          }
      });

      getStore(name).push(newItem);
      return applyInclude(newItem, args?.include, name);
    }),
    createMany: vi.fn().mockImplementation(async (args) => {
      const data = Array.isArray(args?.data) ? args.data : [args?.data];
      const newItems = data.map((item: any) => ({
        id: item.id || `mock-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...(MODEL_DEFAULTS[name] || {}),
        ...item,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      getStore(name).push(...newItems);
      return { count: newItems.length, length: newItems.length };
    }),
    update: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      const index = data.findIndex(item => matches(item, args.where));
      if (index === -1) throw new Error(`${name} not found`);
      
      const updateData = { ...args.data };
      Object.entries(updateData).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
              if ('connect' in (value as any)) {
                  updateData[key + 'Id'] = (value as any).connect.id;
                  delete updateData[key];
              } else if ('deleteMany' in (value as any)) {
                  delete updateData[key];
              } else if ('create' in (value as any)) {
                  delete updateData[key];
              }
          }
      });

      data[index] = { ...data[index], ...updateData, updatedAt: new Date() };
      return applyInclude({ ...(MODEL_DEFAULTS[name] || {}), ...data[index] }, args?.include, name);
    }),
    updateMany: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      let count = 0;
      data.forEach((item, index) => {
        if (matches(item, args.where)) {
          data[index] = { ...item, ...args.data, updatedAt: new Date() };
          count++;
        }
      });
      return { count };
    }),
    delete: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      const index = data.findIndex(item => matches(item, args.where));
      if (index === -1) throw new Error(`${name} not found`);
      const deleted = data.splice(index, 1)[0];
      return { ...(MODEL_DEFAULTS[name] || {}), ...deleted };
    }),
    deleteMany: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      if (!args?.where || Object.keys(args.where).length === 0) {
        const count = data.length;
        store.set(name, []);
        return { count };
      }
      let count = 0;
      for (let i = data.length - 1; i >= 0; i--) {
        const item = data[i];
        if (matches(item, args.where)) {
          data.splice(i, 1);
          count++;
        }
      }
      return { count };
    }),
    upsert: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      const index = data.findIndex(item => matches(item, args.where));
      if (index !== -1) {
        const updateData = { ...args.update };
        data[index] = { ...data[index], ...updateData, updatedAt: new Date() };
        return applyInclude({ ...(MODEL_DEFAULTS[name] || {}), ...data[index] }, args?.include, name);
      } else {
        const createData = { ...args.create };
        if (args.where) {
            Object.entries(args.where).forEach(([_key, value]) => {
                if (typeof value === 'object' && value !== null && !('in' in value || 'contains' in value)) {
                    Object.assign(createData, value);
                }
            });
        }

        const newItem = {
          id: createData.id || `mock-${name}-${Date.now()}`,
          ...(MODEL_DEFAULTS[name] || {}),
          ...createData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        data.push(newItem);
        return applyInclude(newItem, args?.include, name);
      }
    }),
    count: vi.fn().mockImplementation(async (args) => {
      let data = getStore(name);
      if (args?.where) {
        data = data.filter(item => matches(item, args.where));
      }
      return data.length;
    }),
    aggregate: vi.fn().mockImplementation(async (args) => {
        const data = getStore(name).filter(item => matches(item, args?.where || {}));
        const result: any = { _count: { id: data.length }, _sum: {}, _min: {}, _max: {}, _avg: {} };
        if (args?._max) {
            Object.keys(args._max).forEach(key => {
                result._max[key] = data.length > 0 ? Math.max(...data.map(item => item[key] || 0)) : null;
            });
        }
        return result;
    }),
    groupBy: vi.fn().mockResolvedValue([]),
    $reset: () => store.set(name, []),
  });

  const mockPrismaClient = {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') return callback(mockPrismaClient);
      return Promise.resolve(callback);
    }),

    product: createMockModel("product"),
    productImage: createMockModel("productImage"),
    imageFile: createMockModel("imageFile"),
    catalog: createMockModel("catalog"),
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
    note: createMockModel("note"),
    notebook: createMockModel("notebook"),
    tag: createMockModel("tag"),
    category: createMockModel("category"),
    theme: createMockModel("theme"),
    noteTag: createMockModel("noteTag"),
    noteCategory: createMockModel("noteCategory"),
    noteRelation: createMockModel("noteRelation"),
    noteFile: createMockModel("noteFile"),
    user: createMockModel("user"),
    account: createMockModel("account"),
    session: createMockModel("session"),
    userPreferences: createMockModel("userPreferences"),
    authSecurityProfile: createMockModel("authSecurityProfile"),
    verificationToken: createMockModel("verificationToken"),
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

    $resetAll: () => {
      store = new Map<string, any[]>();
    }
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
    onUnhandledRequest: "warn",
  });
});

afterEach(async () => {
  // Reset handlers after each test to ensure test isolation
  server.resetHandlers();
  
  // Reset Prisma mock store
  const { default: prisma } = await import("@/shared/lib/db/prisma");
  if ((prisma as any).$resetAll) {
    (prisma as any).$resetAll();
  }
});

afterAll(() => {
  // Clean up and stop the server after all tests complete
  server.close();
});