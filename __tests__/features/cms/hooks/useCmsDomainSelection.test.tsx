import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useCmsDomainSelection } from '@/features/cms/hooks/useCmsDomainSelection';
import { useCmsDomains } from '@/features/cms/hooks/useCmsQueries';
import { server } from '@/mocks/server';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

// Mock the hooks
vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsDomains: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('useCmsDomainSelection Hook', () => {
  let queryClient: QueryClient;
  const mockDomains = [
    { id: 'd1', domain: 'example.com' },
    { id: 'd2', domain: 'test.com', aliasOf: 'd1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    
    // Default mock implementations
    (useCmsDomains as any).mockReturnValue({ data: mockDomains, isLoading: false });
    (useSettingsMap as any).mockReturnValue({
      data: new Map([['cms_domain_settings.v1', JSON.stringify({ zoningEnabled: true })]]),
      isLoading: false,
    });
    (useSettingsStore as any).mockReturnValue({
      get: vi.fn((key) => {
        if (key === 'cms_domain_settings.v1') return JSON.stringify({ zoningEnabled: true });
        return null;
      }),
    });
    
    server.use(
      http.get('/api/user/preferences', () => {
        return HttpResponse.json({ cmsActiveDomainId: 'd1' });
      }),
      http.patch('/api/user/preferences', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(body);
      })
    );
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should return active domain from preferences', async () => {
    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.activeDomainId).toBe('d1');
    expect(result.current.activeDomain!.domain).toBe('example.com');
    expect(result.current.zoningEnabled).toBe(true);
  });

  it('should return shared domains for a canonical domain', async () => {
    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.sharedWithDomains).toHaveLength(1);
    expect(result.current.sharedWithDomains[0]!.id).toBe('d2');
  });

  it('should return canonical domain for an alias', async () => {
    server.use(
      http.get('/api/user/preferences', () => {
        return HttpResponse.json({ cmsActiveDomainId: 'd2' });
      })
    );

    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.activeDomainId).toBe('d2'), { timeout: 2000 });
    
    expect(result.current.canonicalDomain!.id).toBe('d1');
  });

  it('should handle setting active domain', async () => {
    let capturedBody: any = null;
    server.use(
      http.patch('/api/user/preferences', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(capturedBody);
      })
    );
    
    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    result.current.setActiveDomainId('d2');
    
    await waitFor(() => expect(capturedBody).toEqual({ cmsActiveDomainId: 'd2' }));
  });

  it('should disable zoning if setting is false', async () => {
    (useSettingsMap as any).mockReturnValue({
      data: new Map([['cms_domain_settings.v1', JSON.stringify({ zoningEnabled: false })]]),
      isLoading: false,
    });
    (useSettingsStore as any).mockReturnValue({
      get: vi.fn((key) => {
        if (key === 'cms_domain_settings.v1') return JSON.stringify({ zoningEnabled: false });
        return null;
      }),
    });

    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.zoningEnabled).toBe(false);
    expect(result.current.activeDomainId).toBeNull();
  });

  it('should detect host domain', async () => {
    // Mock window.location.hostname
    const originalLocation = window.location;
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'test.com' } as Location,
      configurable: true,
    });

    server.use(
      http.get('/api/user/preferences', () => {
        return HttpResponse.json({ cmsActiveDomainId: null });
      })
    );

    const { result } = renderHook(() => useCmsDomainSelection(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.hostDomainId).toBe('d2');
    expect(result.current.activeDomainId).toBe('d2');

    // Restore window.location
    delete (window as any).location;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });
});