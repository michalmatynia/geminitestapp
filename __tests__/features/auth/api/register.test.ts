import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { POST } from '@/app/api/auth/register/route';

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
vi.mock('@/features/auth/server', () => ({
  getAuthDataProvider: vi.fn().mockResolvedValue('mongodb'),
  getAuthUserPageSettings: vi.fn().mockResolvedValue({
    allowSignup: true,
    requireEmailVerification: false,
  }),
  getAuthSecurityPolicy: vi.fn().mockResolvedValue({}),
  validatePasswordStrength: vi.fn().mockReturnValue({ ok: true, errors: [] }),
  normalizeAuthEmail: (email: string) => email.toLowerCase().trim(),
}));

// Mock DB provider to force MongoDB path for system logs
vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn().mockResolvedValue('mongodb'),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: mockCollection,
  }),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

describe('Auth Register API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  });

  it('registers a new user successfully with MongoDB', async () => {
    mockFindOne.mockResolvedValue(null);
    mockInsertOne.mockResolvedValue({ insertedId: 'u1' });

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'NEW@example.com ',
        password: 'password123',
        name: 'New User',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.email).toBe('new@example.com');
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockInsertOne).toHaveBeenCalled();
  });

  it('returns 409 if user already exists', async () => {
    mockFindOne.mockResolvedValue({ _id: 'existing', email: 'existing@example.com' });

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'password123',
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain('already exists');
  });
});