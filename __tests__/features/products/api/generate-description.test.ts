/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { vi } from 'vitest';

import { POST } from '@/app/api/generate-description/route';
import prisma from '@/shared/lib/db/prisma';

// Mock CSRF
vi.mock('@/shared/lib/security/csrf', () => ({
  CSRF_SAFE_METHODS: new Set(['GET', 'HEAD', 'OPTIONS']),
  isSameOriginRequest: vi.fn().mockReturnValue(true),
  getCsrfTokenFromRequest: vi.fn().mockReturnValue('mock-csrf'),
  getCsrfTokenFromHeaders: vi.fn().mockReturnValue('mock-csrf'),
}));

// Mock Prisma client
const settingsStore = new Map<string, string>();
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      deleteMany: vi.fn().mockImplementation(async () => {
        settingsStore.clear();
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        settingsStore.set(data.key, data.value);
        return data;
      }),
      createMany: vi.fn().mockImplementation(async ({ data }) => {
        data.forEach((item: any) => settingsStore.set(item.key, item.value));
        return { count: data.length };
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        const value = settingsStore.get(where.key);
        return value ? { key: where.key, value } : null;
      }),
    },
    systemLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $disconnect: vi.fn(),
  },
}));

const { mockCreate, MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  }
  return {
    mockCreate,
    MockOpenAI,
  };
});

vi.mock('openai', () => {
  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

describe('AI Description Generation API', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv, OPENAI_API_KEY: '' };
    await prisma.setting.deleteMany({});
    mockCreate.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return a generated description', async () => {
    await prisma.setting.createMany({
      data: [
        { key: 'openai_api_key', value: 'test-api-key' },
        { key: 'ai_vision_model', value: 'gpt-4o' },
        { key: 'openai_model', value: 'gpt-3.5-turbo' },
      ],
    });

    const mockCompletion = {
      choices: [{ message: { content: 'This is a test description.' } }],
    };
    mockCreate.mockResolvedValue(mockCompletion);

    const req = new NextRequest(
      'http://localhost/api/generate-description',
      {
        method: 'POST',
        body: JSON.stringify({
          productData: { name_en: 'Test Product', sku: 'TEST-SKU' },
          imageUrls: [],
        }),
      }
    );

    const res = await POST(req);
    const data = (await res.json()) as { description: string };

    expect(res.status).toBe(200);
    expect(data.description).toBe('This is a test description.');
    // Called once for vision, once for generation
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: 'gpt-3.5-turbo' })
    );
  });

  it('should fail if product name is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/generate-description',
      {
        method: 'POST',
        body: JSON.stringify({ productData: {}, imageUrls: [] }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should fail if API key is not configured', async () => {
    // Both setting and env are empty
    // Force OpenAI models so it checks for API key
    await prisma.setting.createMany({
      data: [
        { key: 'ai_vision_model', value: 'gpt-4o' },
        { key: 'openai_model', value: 'gpt-3.5-turbo' },
      ],
    });

    const req = new NextRequest(
      'http://localhost/api/generate-description',
      {
        method: 'POST',
        body: JSON.stringify({
          productData: { name_en: 'Test Product', sku: 'TEST-SKU' },
          imageUrls: [],
        }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('should use the custom prompt from settings', async () => {
    await prisma.setting.createMany({
      data: [
        { key: 'openai_api_key', value: 'test-api-key' },
        { key: 'ai_vision_model', value: 'gpt-4o' },
        {
          key: 'openai_model',
          value: 'gpt-3.5-turbo',
        },
        {
          key: 'description_generation_user_prompt',
          value: 'Custom prompt for [name_en]',
        },
      ],
    });

    const mockCompletion = {
      choices: [{ message: { content: 'Custom description' } }],
    };
    mockCreate.mockResolvedValue(mockCompletion);

    const req = new NextRequest(
      'http://localhost/api/generate-description',
      {
        method: 'POST',
        body: JSON.stringify({
          productData: { name_en: 'Test Product', sku: 'TEST-SKU' },
          imageUrls: [],
        }),
      }
    );

    await POST(req);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                text: 'Custom prompt for Test Product',
              }),
            ]),
          }),
        ]),
      })
    );
  });
});
