import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHandler } from './handler';
import { auth, listAuthUsers, logAuthEvent } from '@/features/auth/server';

vi.mock('@/features/auth/server', () => ({
  auth: vi.fn(),
  listAuthUsers: vi.fn(),
  logAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('auth/users getHandler', () => {
  const mockContext = { source: 'test' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws authError if user is not elevated and has no permissions', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { isElevated: false, permissions: [] }
    } as any);

    const req = new NextRequest('http://localhost/api/auth/users');
    await expect(getHandler(req, mockContext)).rejects.toThrow('Unauthorized.');
  });

  it('returns users if user is elevated', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-1', isElevated: true }
    } as any);
    const mockUsers = [{ id: 'user-1', email: 'test@example.com' }];
    vi.mocked(listAuthUsers).mockResolvedValue(mockUsers as any);

    const req = new NextRequest('http://localhost/api/auth/users');
    const response = await getHandler(req, mockContext);
    const data = await response.json();

    expect(data.users).toEqual(mockUsers);
    expect(logAuthEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.users.list', stage: 'success' }));
  });

  it('returns users if user has auth.users.read permission', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-2', isElevated: false, permissions: ['auth.users.read'] }
    } as any);
    const mockUsers = [{ id: 'user-1' }];
    vi.mocked(listAuthUsers).mockResolvedValue(mockUsers as any);

    const req = new NextRequest('http://localhost/api/auth/users');
    const response = await getHandler(req, mockContext);
    const data = await response.json();

    expect(data.users).toEqual(mockUsers);
  });
});
