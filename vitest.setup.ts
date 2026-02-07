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
  product: { images: [], catalogs: [], categories: [], tags: [], producers: [] },
  note: { tags: [], categories: [], files: [], relationsFrom: [], relationsTo: [] },
  catalog: { products: [], languages: [], categories: [], tags: [], priceGroups: [] },
  page: { slugs: [], components: [] },
  language: { countries: [] },
  country: { languages: [], currencies: [] },
  category: { notes: [], children: [] },
  imageFile: { products: [] },
  systemLog: {}, // Add systemLog default
};

const RELATION_MAP: Record<string, Record<string, { model: string; junction?: { table: string; field: string; foreignKey: string; }; }>> = {
  product: {
    images: { model: "productImage" },
    catalogs: { model: "catalog", junction: { table: "productCatalog", field: "catalog", foreignKey: "catalogId" } },
    categories: { model: "category", junction: { table: "productCategoryAssignment", field: "category", foreignKey: "categoryId" } },
    tags: { model: "productTag", junction: { table: "productTagAssignment", field: "productTag", foreignKey: "productTagId" } },
    producers: { model: "productProducer", junction: { table: "productProducerAssignment", field: "productProducer", foreignKey: "productProducerId" } },
    variants: { model: "productVariant" },
  },
  note: {
    tags: { model: "tag", junction: { table: "noteTag", field: "tag", foreignKey: "tagId" } },
    categories: { model: "category", junction: { table: "noteCategory", field: "category", foreignKey: "categoryId" } },
    files: { model: "imageFile", junction: { table: "noteFile", field: "imageFile", foreignKey: "imageFileId" } },
    relationsFrom: { model: "noteRelation" },
    relationsTo: { model: "noteRelation" },
    notebook: { model: "notebook" },
  },
  catalog: {
    products: { model: "product", junction: { table: "productCatalog", field: "product", foreignKey: "productId" } },
    languages: { model: "language", junction: { table: "catalogLanguage", field: "language", foreignKey: "languageId" } },
    categories: { model: "category", junction: { table: "productCategory", field: "category", foreignKey: "categoryId" } },
    tags: { model: "productTag" },
    priceGroups: { model: "priceGroup" },
  },
  page: {
    slugs: { model: "slug", junction: { table: "pageSlug", field: "slug", foreignKey: "slugId" } },
    components: { model: "pageComponent" },
    theme: { model: "cmsTheme" },
  },
  language: {
    countries: { model: "country", junction: { table: "languageCountry", field: "country", foreignKey: "countryId" } },
    catalogs: { model: "catalog", junction: { table: "catalogLanguage", field: "catalog", foreignKey: "catalogId" } },
  },
  country: {
    languages: { model: "language", junction: { table: "languageCountry", field: "language", foreignKey: "languageId" } },
    currencies: { model: "currency", junction: { table: "countryCurrency", field: "currency", foreignKey: "currencyId" } },
  },
  category: {
    notes: { model: "note", junction: { table: "noteCategory", field: "note", foreignKey: "noteId" } },
    products: { model: "product", junction: { table: "productCategoryAssignment", field: "product", foreignKey: "productId" } },
    children: { model: "category" },
    parent: { model: "category" },
  },
  imageFile: {
    products: { model: "productImage" },
    notes: { model: "noteFile" },
  },
  systemLog: {},
  user: {
    accounts: { model: "account" },
    sessions: { model: "session" },
    securityProfile: { model: "authSecurityProfile" },
    preferences: { model: "userPreferences" },
  },
  chatbotSession: {
    messages: { model: "chatbotMessage" },
  },
  chatbotAgentRun: {
    logs: { model: "agentBrowserLog" },
    audits: { model: "agentAuditLog" },
    memoryItems: { model: "agentMemoryItem" },
  },
  asset3D: {
    tags: { model: "tag" },
    categories: { model: "category" },
    files: { model: "imageFile" },
  },
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

  const applyInclude = (item: any, include: any, modelName: string, getStore: (name: string) => any[]) => {
  if (!include || !item) return item;
  const newItem = { ...(MODEL_DEFAULTS[modelName] || {}), ...item };

  Object.keys(include).forEach(key => {
    if (include[key]) {
      const relationConfig = RELATION_MAP[modelName]?.[key];

      if (relationConfig) {
        if (relationConfig.junction) {
          // Handle junction table relations (many-to-many)
          const junctionStore = getStore(relationConfig.junction.table);
          const relatedItems = junctionStore
            .filter(junc => junc[`${modelName}Id`] === item.id)
            .map(junc => {
              const relatedModelItem = getStore(relationConfig.model).find(relItem => relItem.id === junc[relationConfig.junction!.foreignKey]);
              // Recursively apply includes to the related model item
              return relatedModelItem ? applyInclude(relatedModelItem, include[key].include, relationConfig.model, getStore) : null;
            })
            .filter(Boolean); // Filter out nulls if related item not found
          newItem[key] = relatedItems;
        } else {
          // Handle direct relations (one-to-many, one-to-one)
          let relatedData;
          if (Array.isArray(newItem[key])) { // If it's a one-to-many
            relatedData = getStore(relationConfig.model).filter(relItem => relItem[`${modelName}Id`] === item.id);
            if (include[key].include) {
              relatedData = relatedData.map(relItem => applyInclude(relItem, include[key].include, relationConfig.model, getStore));
            }
          } else if (typeof newItem[key] === 'object' && newItem[key] !== null) { // If it's a one-to-one (already embedded or connected)
            relatedData = getStore(relationConfig.model).find(relItem => relItem.id === newItem[key].id || relItem.id === newItem[`${key}Id`]);
            if (relatedData && include[key].include) {
              relatedData = applyInclude(relatedData, include[key].include, relationConfig.model, getStore);
            }
          } else { // Fallback for simple ID-based relation (e.g., `product.catalogId`)
            relatedData = getStore(relationConfig.model).find(relItem => relItem.id === item[`${key}Id`]);
            if (relatedData && include[key].include) {
              relatedData = applyInclude(relatedData, include[key].include, relationConfig.model, getStore);
            }
          }
          newItem[key] = relatedData !== undefined ? relatedData : (Array.isArray(include[key]) ? [] : null); // Default to empty array or null
        }
      } else if (modelName === 'note' && key === 'relationsFrom') {
        newItem.relationsFrom = getStore('noteRelation').filter(nr => nr.sourceNoteId === item.id);
        if (include.relationsFrom.include) {
          newItem.relationsFrom = newItem.relationsFrom.map((rel: Record<string, unknown>) =>
            applyInclude(rel, include.relationsFrom.include, 'noteRelation', getStore)
          );
        }
      } else if (modelName === 'note' && key === 'relationsTo') {
        newItem.relationsTo = getStore('noteRelation').filter(nr => nr.targetNoteId === item.id);
        if (include.relationsTo.include) {
          newItem.relationsTo = newItem.relationsTo.map((rel: Record<string, unknown>) =>
            applyInclude(rel, include.relationsTo.include, 'noteRelation', getStore)
          );
        }
      } else if (modelName === 'category' && key === 'notes') {
        // Specific handling for category.notes (many-to-many through noteCategory)
        const junctionData = getStore('noteCategory').filter(nc => nc.categoryId === item.id);
        newItem.notes = junctionData.map(junc => {
            const note = getStore('note').find(n => n.id === junc.noteId);
            return note ? applyInclude(note, include.notes.include, 'note', getStore) : null;
        }).filter(Boolean);
      } else {
        // If no specific relation config, assume it's a direct relation or simple field and try to include if it exists in store
        // Or it's a direct ID that should be resolved to a full object.
        const relatedModel = getStore(key); // e.g., getStore('tag') for 'tag' include
        if (relatedModel && relatedModel.length > 0) {
          // This might be a 'has many' or 'has one' relationship where the foreign key is on the *other* table.
          // For simplicity, for generic relations, we'll try to find an ID match if available.
          // This part is less robust and might need more specific RELATION_MAP entries.
          const fk = `${modelName}Id`;
          if (item[fk]) {
            const relatedItem = relatedModel.find(rel => rel.id === item[fk]);
            if (relatedItem) {
              newItem[key] = applyInclude(relatedItem, include[key].include, key, getStore);
            }
          }
        }
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
          return applyInclude(withDefaults, args?.include, name, getStore);
      });
    }),
    findUnique: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      const item = data.find(item => matches(item, args.where)) || null;
      if (!item) return null;
      const withDefaults = { ...(MODEL_DEFAULTS[name] || {}), ...item };
      return applyInclude(withDefaults, args?.include, name, getStore);
    }),
    findFirst: vi.fn().mockImplementation(async (args) => {
      const data = getStore(name);
      let item;
      if (!args?.where) item = data[0];
      else item = data.find(item => matches(item, args.where));
      
      if (!item) return null;
      const withDefaults = { ...(MODEL_DEFAULTS[name] || {}), ...item };
      return applyInclude(withDefaults, args?.include, name, getStore);
    }),
    create: vi.fn().mockImplementation(async (args) => {
      const data = { ...args?.data };
      // Strip nested prisma objects to prevent "map of undefined" errors in convert functions
      Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key] === 'object' && ('create' in data[key] || 'connect' in data[key] || 'createMany' in data[key] || 'connectOrCreate' in data[key])) {
          delete data[key];
        }
      });

      const newItem = {
        id: data.id || `mock-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...(MODEL_DEFAULTS[name] || {}),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      
      // Handle nested connects (simplified)
      Object.entries(args?.data || {}).forEach(([key, value]) => {
          if (value && typeof value === 'object' && 'connect' in (value as any)) {
              newItem[key + 'Id'] = (value as any).connect.id;
          }
      });

      getStore(name).push(newItem);
      return applyInclude(newItem, args?.include, name, getStore);
    }),
    createMany: vi.fn().mockImplementation(async (args) => {
      const data = Array.isArray(args?.data) ? args.data : [args?.data];
      const now = new Date();
      const newItems = data.map((item: any) => ({
        id: item.id || `mock-${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...(MODEL_DEFAULTS[name] || {}),
        createdAt: now,
        updatedAt: now,
        ...item,
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
          if (value && typeof value === 'object') {
              if ('connect' in (value as any)) {
                  updateData[key + 'Id'] = (value as any).connect.id;
                  delete updateData[key];
              } else if ('deleteMany' in (value as any) || 'create' in (value as any) || 'createMany' in (value as any) || 'connectOrCreate' in (value as any)) {
                  delete updateData[key];
              }
          }
      });

      data[index] = { ...data[index], ...updateData, updatedAt: new Date() };
      return applyInclude({ ...(MODEL_DEFAULTS[name] || {}), ...data[index] }, args?.include, name, getStore);
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
        return applyInclude({ ...(MODEL_DEFAULTS[name] || {}), ...data[index] }, args?.include, name, getStore);
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
        return applyInclude(newItem, args?.include, name, getStore);
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
    productProducerAssignment: createMockModel("productProducerAssignment"),
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
    setting: createMockModel("setting"),
    fileUploadEvent: createMockModel("fileUploadEvent"),
    aiConfiguration: createMockModel("aiConfiguration"),
    productAiJob: createMockModel("productAiJob"),

    $resetAll: () => {
      store = new Map<string, any[]>();
    }
  };

  return {
    default: mockPrismaClient,
  };
});

// Mock observability server module
vi.mock('@/features/observability/server', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  logSystemError: vi.fn().mockResolvedValue(undefined),
  getErrorFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
  listSystemLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  createSystemLog: vi.fn().mockResolvedValue({}),
  clearSystemLogs: vi.fn().mockResolvedValue({ deleted: 0 }),
  getSystemLogMetrics: vi.fn().mockResolvedValue({
    total: 0,
    last24Hours: 0,
    last7Days: 0,
    levels: { error: 0, warn: 0, info: 0 },
    topSources: [],
    topPaths: [],
  }),
  ErrorSystem: {
    captureException: vi.fn().mockResolvedValue(undefined),
    logWarning: vi.fn().mockResolvedValue(undefined),
    logError: vi.fn().mockResolvedValue(undefined),
    logInfo: vi.fn().mockResolvedValue(undefined),
  },
}));

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

// Mock next/server (for NextRequest/NextResponse in API routes)
vi.mock("next/server", () => {
  class MockResponse extends Response {
    static override json(data: any, init?: ResponseInit) {
      const res = new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
      return res;
    }
  }

  return {
    NextRequest: class NextRequest extends Request {
      constructor(input: RequestInfo, init?: RequestInit) {
        super(input, init);
      }
    },
    NextResponse: MockResponse,
  };
});

// Mock next/server.js specifically, as suggested by the error message
vi.mock("next/server.js", () => {
  class MockResponse extends Response {
    static override json(data: any, init?: ResponseInit) {
      const res = new MockResponse(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
      return res;
    }
  }

  return {
    NextRequest: class NextRequest extends Request {
      constructor(input: RequestInfo, init?: RequestInit) {
        super(input, init);
      }
    },
    NextResponse: MockResponse,
  };
});

// Mock apiHandler globally
vi.mock('@/shared/lib/api/api-handler', () => {
  const { NextResponse } = require('next/server');
  return {
    apiHandler: (handler: any) => async (req: any) => {
      try {
        const body = req.body && typeof req.json === 'function' ? await req.json().catch(() => ({})) : {};
        return await handler(req, { requestId: 'global-test-id', body, getElapsedMs: () => 0 });
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.httpStatus || 500 }
        );
      }
    },
    apiHandlerWithParams: (handler: any) => async (req: any, ctx: any) => {
      try {
        const body = req.body && typeof req.json === 'function' ? await req.json().catch(() => ({})) : {};
        const context = {
          ...ctx,
          requestId: 'global-test-id',
          body,
          getElapsedMs: () => 0,
        };
        const resolvedParams = ctx?.params && typeof ctx.params.then === 'function' ? await ctx.params : (ctx?.params ?? {});
        return await handler(req, context, resolvedParams);
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.httpStatus || 500 }
        );
      }
    },
    getQueryParams: (req: any) => new URL(req.url).searchParams,
    getRequiredParam: (searchParams: URLSearchParams, name: string) => {
      const val = searchParams.get(name);
      if (!val) throw new Error(`Missing required parameter: ${name}`);
      return val;
    },
    getPaginationParams: (searchParams: URLSearchParams) => ({
      page: Number(searchParams.get('page') ?? '1'),
      pageSize: Number(searchParams.get('pageSize') ?? '20'),
      skip: 0,
    }),
  };
});

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
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
if (typeof window !== 'undefined') {
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
}

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