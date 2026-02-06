import { NextRequest } from 'next/server';
import { vi, beforeEach, afterAll, describe, it, expect } from 'vitest';

import { POST } from '@/app/api/auth/register/route';
import { getAuthUserPageSettings, validatePasswordStrength } from '@/features/auth/server';

// Hoist mock definitions so they can be used in vi.mock
const { mockCollection, mockInsertOne, mockFindOne } = vi.hoisted(() => {
  const mockInsertOne = vi.fn();
  const mockFindOne = vi.fn();
  const mockCollection = vi.fn(() => ({
    findOne: mockFindOne,
    insertOne: mockInsertOne,
  }));
  return { mockCollection, mockInsertOne, mockFindOne };
});

// Mock server modules
vi.mock('@/features/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth/server')>();
  return {
    ...actual,
    getAuthDataProvider: vi.fn().mockResolvedValue('mongodb'),
    getAuthUserPageSettings: vi.fn().mockResolvedValue({
      allowSignup: true,
      requireEmailVerification: false,
    }),
    getAuthSecurityPolicy: vi.fn().mockResolvedValue({}),
    validatePasswordStrength: vi.fn().mockReturnValue({ ok: true, errors: [] }),
    normalizeAuthEmail: (email: string) => email.toLowerCase().trim(),
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: mockCollection,
  }),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

// Mock apiHandler
vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: (handler: any) => handler,
}));

describe('Auth Register API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = 'mongodb://mock';
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.MONGODB_URI;
  });

  it('should successfully register a new user', async () => {
    mockFindOne.mockResolvedValue(null);
    mockInsertOne.mockResolvedValue({ insertedId: 'user-id' });

    const payload = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const res = await POST(
      new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );

    const data = await res.json();
    expect(res.status).toEqual(201);
    expect(data.id).toEqual('user-id');
    expect(data.email).toEqual('test@example.com');
  });

  it('should return 409 if user already exists', async () => {
    mockFindOne.mockResolvedValue({ email: 'existing@example.com' });

    const payload = {
      email: 'existing@example.com',
      password: 'password123',
    };

    const res = await POST(
      new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(409);
  });

  it('should return 403 if registration is disabled', async () => {
    vi.mocked(getAuthUserPageSettings).mockResolvedValue({ allowSignup: false } as any);

    const payload = {
      email: 'test@example.com',
      password: 'password123',
    };

    const res = await POST(
      new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(403);
  });

  it('should return 400 if password does not meet policy', async () => {
    vi.mocked(validatePasswordStrength).mockReturnValue({ ok: false, errors: ['Too short'] } as any);

    const payload = {
      email: 'test@example.com',
      password: '123',
    };

    const res = await POST(
      new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(400);
  });
});