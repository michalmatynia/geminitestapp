import { vi } from 'vitest';

const createMockModel = () => {
  let items: any[] = [];

  const model = {
    findUnique: vi.fn().mockImplementation((args: { where: Record<string, unknown> }) => {
      const item = items.find(i => Object.entries(args.where).every(([k, v]) => i[k] === v));
      return Promise.resolve(item || null);
    }),
    findUniqueOrThrow: vi.fn().mockImplementation((args: { where: Record<string, unknown> }) => {
      const item = items.find(i => Object.entries(args.where).every(([k, v]) => i[k] === v));
      if (!item) return Promise.reject(new Error('Record not found'));
      return Promise.resolve(item);
    }),
    findFirst: vi.fn().mockImplementation((args: { where?: Record<string, any> }) => {
      if (!args?.where) return Promise.resolve(items[0] || null);
      // Basic filter support for nextRetryAt logic
      const item = items.find(i => {
        return Object.entries(args.where!).every(([k, v]) => {
          if (v && typeof v === 'object' && 'lte' in v) {
            return i[k] <= v.lte;
          }
          if (v && typeof v === 'object' && 'in' in v) {
            return Array.isArray(v.in) && v.in.includes(i[k]);
          }
          return i[k] === v;
        });
      });
      return Promise.resolve(item || null);
    }),
    findFirstOrThrow: vi.fn().mockImplementation((args: { where: Record<string, unknown> }) => {
      const item = items.find(i => Object.entries(args.where).every(([k, v]) => i[k] === v));
      if (!item) return Promise.reject(new Error('Record not found'));
      return Promise.resolve(item);
    }),
    findMany: vi.fn().mockImplementation((args?: { where?: Record<string, any> }) => {
      if (!args?.where) return Promise.resolve([...items]);
      const filtered = items.filter(i => {
        return Object.entries(args.where!).every(([k, v]) => {
          if (v && typeof v === 'object' && 'in' in v) {
            return Array.isArray(v.in) && v.in.includes(i[k]);
          }
          if (v && typeof v === 'object' && 'contains' in v) {
            const val = i[k];
            return typeof val === 'string' && val.toLowerCase().includes(v.contains.toLowerCase());
          }
          return i[k] === v;
        });
      });
      return Promise.resolve(filtered);
    }),
    create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
      const newItem = {
        id: 'mock-id-' + Math.random().toString(36).slice(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      };
      items.push(newItem);
      return Promise.resolve(newItem);
    }),
    createMany: vi.fn().mockImplementation((args: { data: Record<string, unknown>[] }) => {
      const newItems = args.data.map(d => ({
        id: 'mock-id-' + Math.random().toString(36).slice(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d,
      }));
      items.push(...newItems);
      return Promise.resolve({ count: newItems.length });
    }),
    delete: vi.fn().mockImplementation((args: { where: { id: string } }) => {
      const index = items.findIndex(i => i.id === args.where.id);
      if (index === -1) return Promise.reject(new Error('Record not found'));
      const item = items[index];
      items.splice(index, 1);
      return Promise.resolve(item);
    }),
    update: vi.fn().mockImplementation((args: { where: { id: string }; data: Record<string, unknown> }) => {
      const index = items.findIndex(i => i.id === args.where.id);
      if (index === -1) return Promise.reject(new Error('Record not found'));
      items[index] = { ...items[index], ...args.data, updatedAt: new Date() };
      return Promise.resolve(items[index]);
    }),
    deleteMany: vi.fn().mockImplementation((args?: { where?: Record<string, any> }) => {
      if (!args?.where || Object.keys(args.where).length === 0) {
        const count = items.length;
        items = [];
        return Promise.resolve({ count });
      }
      const initialCount = items.length;
      items = items.filter(i => !Object.entries(args.where!).every(([k, v]) => i[k] === v));
      return Promise.resolve({ count: initialCount - items.length });
    }),
    updateMany: vi.fn().mockImplementation((args: { where: Record<string, any>; data: Record<string, unknown> }) => {
      let count = 0;
      items = items.map(i => {
        const match = Object.entries(args.where).every(([k, v]) => {
          if (v && typeof v === 'object' && 'in' in v) {
            return Array.isArray(v.in) && v.in.includes(i[k]);
          }
          if (v && typeof v === 'object' && 'lte' in v) {
            return i[k] <= v.lte;
          }
          if (v && typeof v === 'object' && 'lt' in v) {
            return i[k] < v.lt;
          }
          return i[k] === v;
        });
        if (match) {
          count++;
          return { ...i, ...args.data, updatedAt: new Date() };
        }
        return i;
      });
      return Promise.resolve({ count });
    }),
    upsert: vi.fn().mockImplementation((args: { where: Record<string, any>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const index = items.findIndex(i => {
        if (args.where.runId_nodeId) {
          return i.runId === args.where.runId_nodeId.runId && i.nodeId === args.where.runId_nodeId.nodeId;
        }
        return Object.entries(args.where).every(([k, v]) => i[k] === v);
      });
      if (index === -1) {
        const newItem = {
          id: 'mock-id-' + Math.random().toString(36).slice(2, 9),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.create,
        };
        items.push(newItem);
        return Promise.resolve(newItem);
      }
      items[index] = { ...items[index], ...args.update, updatedAt: new Date() };
      return Promise.resolve(items[index]);
    }),
    count: vi.fn().mockImplementation((args?: { where?: Record<string, any> }) => {
      if (!args?.where) return Promise.resolve(items.length);
      const filtered = items.filter(i => Object.entries(args.where!).every(([k, v]) => i[k] === v));
      return Promise.resolve(filtered.length);
    }),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
  return model;
};

const prismaMock = {
  product: createMockModel(),
  setting: createMockModel(),
  systemLog: createMockModel(),
  fileUploadEvent: createMockModel(),
  chatbotSettings: createMockModel(),
  imageFile: createMockModel(),
  currency: createMockModel(),
  country: createMockModel(),
  integration: createMockModel(),
  integrationConnection: createMockModel(),
  productListing: createMockModel(),
  language: createMockModel(),
  priceGroup: createMockModel(),
  productImage: createMockModel(),
  catalog: createMockModel(),
  productParameter: createMockModel(),
  productCatalog: createMockModel(),
  chatbotAgentRun: createMockModel(),
  agentMemoryItem: createMockModel(),
  agentLongTermMemory: createMockModel(),
  agentAuditLog: createMockModel(),
  agentBrowserSnapshot: createMockModel(),
  agentBrowserLog: createMockModel(),
  chatbotSession: createMockModel(),
  chatbotMessage: createMockModel(),
  chatbotJob: createMockModel(),
  catalogLanguage: createMockModel(),
  languageCountry: createMockModel(),
  countryCurrency: createMockModel(),
  slug: createMockModel(),
  cmsTheme: createMockModel(),
  page: createMockModel(),
  pageSlug: createMockModel(),
  cmsDomain: createMockModel(),
  cmsDomainSlug: createMockModel(),
  pageComponent: createMockModel(),
  note: createMockModel(),
  noteFile: createMockModel(),
  theme: createMockModel(),
  tag: createMockModel(),
  category: createMockModel(),
  notebook: createMockModel(),
  noteTag: createMockModel(),
  noteCategory: createMockModel(),
  noteRelation: createMockModel(),
  productCategory: createMockModel(),
  productCategoryAssignment: createMockModel(),
  productTag: createMockModel(),
  productTagAssignment: createMockModel(),
  producer: createMockModel(),
  productProducerAssignment: createMockModel(),
  user: createMockModel(),
  authSecurityProfile: createMockModel(),
  authLoginChallenge: createMockModel(),
  authSecurityAttempt: createMockModel(),
  userPreferences: createMockModel(),
  account: createMockModel(),
  session: createMockModel(),
  verificationToken: createMockModel(),
  aiConfiguration: createMockModel(),
  productAiJob: createMockModel(),
  aiPathRun: createMockModel(),
  aiPathRunNode: createMockModel(),
  aiPathRunEvent: createMockModel(),
  productDraft: createMockModel(),
  productValidationPattern: createMockModel(),
  externalCategory: createMockModel(),
  categoryMapping: createMockModel(),
  externalProducer: createMockModel(),
  producerMapping: createMockModel(),
  externalTag: createMockModel(),
  tagMapping: createMockModel(),
  asset3D: createMockModel(),
  imageStudioSlot: createMockModel(),
  activityLog: createMockModel(),

  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $transaction: vi.fn().mockImplementation((cb: (arg: unknown) => unknown) => cb(prismaMock)),
  $on: vi.fn(),
  $use: vi.fn(),
  $executeRaw: vi.fn().mockResolvedValue(0),
  $executeRawUnsafe: vi.fn().mockResolvedValue(0),
  $queryRaw: vi.fn().mockResolvedValue([]),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  $resetAll: () => {
    Object.values(prismaMock).forEach((model: unknown) => {
      if (model && typeof model === 'object') {
        Object.values(model).forEach((method: unknown) => {
          if (method && typeof method === 'object' && 'mockClear' in method && typeof method.mockClear === 'function') {
            (method as { mockClear: () => void }).mockClear();
          }
        });
      }
    });
    (prismaMock.$executeRaw as vi.Mock).mockClear();
    (prismaMock.$executeRawUnsafe as vi.Mock).mockClear();
    (prismaMock.$queryRaw as vi.Mock).mockClear();
    (prismaMock.$queryRawUnsafe as vi.Mock).mockClear();
  },
};

export default prismaMock;