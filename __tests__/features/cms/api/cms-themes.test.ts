import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { GET as GET_themes, POST as POST_themes } from '@/app/api/cms/themes/route';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import type { CmsTheme } from '@/features/cms/types';

vi.mock('@/features/cms/services/cms-repository', () => ({
  getCmsRepository: vi.fn(),
}));

describe('CMS Themes API', () => {
  let cmsRepository: any;
  let themesStore: CmsTheme[] = [];
  let idCounter = 0;

  const mockRepo = {
    getThemes: vi.fn(() => themesStore),
    createTheme: vi.fn((data: Omit<CmsTheme, 'id'>) => {
      const theme = { id: `theme-${++idCounter}`, ...data } as CmsTheme;
      themesStore = [...themesStore, theme];
      return theme;
    }),
    deleteTheme: vi.fn((id: string) => {
      const existing = themesStore.find((theme) => theme.id === id) ?? null;
      themesStore = themesStore.filter((theme) => theme.id !== id);
      return existing;
    }),
  };

  beforeEach(async () => {
    themesStore = [];
    idCounter = 0;
    vi.clearAllMocks();
    (getCmsRepository as any).mockResolvedValue(mockRepo);
    cmsRepository = await getCmsRepository();
  });

  const validTheme = {
    name: 'Default Theme',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      accent: '#ff0000',
      background: '#ffffff',
      surface: '#f0f0f0',
      text: '#333333',
      muted: '#999999',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      baseSize: 16,
      headingWeight: 700,
      bodyWeight: 400,
    },
    spacing: {
      sectionPadding: '2rem',
      containerMaxWidth: '1200px',
    },
    customCss: '.test { color: red; }',
  };

  it('should create a new theme', async () => {
    const req = new NextRequest('http://localhost/api/cms/themes', {
      method: 'POST',
      body: JSON.stringify(validTheme),
    });

    const res = await POST_themes(req);
    const data = (await res.json()) as CmsTheme;

    expect(res.status).toBe(200);
    expect(data.name).toBe('Default Theme');
    expect(data.id).toBeDefined();
  });

  it('should fetch all themes', async () => {
    await cmsRepository.createTheme(validTheme);

    const res = await GET_themes(new NextRequest('http://localhost/api/cms/themes'));
    const data = (await res.json()) as CmsTheme[];
    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data).toBeDefined();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toBeDefined();
    expect(data[0]!.name).toBe('Default Theme');  });
});
