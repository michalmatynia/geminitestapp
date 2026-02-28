import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    setting: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('getCmsThemeSettings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch theme settings from Prisma when provider is prisma', async () => {
    (getAppDbProvider as any).mockResolvedValue('prisma');
    (prisma.setting.findUnique as any).mockResolvedValue({
      value: JSON.stringify({ primaryColor: '#ff0000' }),
    });

    const settings = await getCmsThemeSettings();

    expect(prisma.setting.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'cms_theme_settings.v1' },
      })
    );
    expect(settings.primaryColor).toBe('#ff0000');
  });

  it('should fetch theme settings from MongoDB when provider is mongodb', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    (getAppDbProvider as any).mockResolvedValue('mongodb');
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue({ value: JSON.stringify({ primaryColor: '#00ff00' }) }),
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    (getMongoDb as any).mockResolvedValue(mockDb);

    const settings = await getCmsThemeSettings();

    expect(mockDb.collection).toHaveBeenCalledWith('settings');
    expect(mockCollection.findOne).toHaveBeenCalled();
    expect(settings.primaryColor).toBe('#00ff00');
  });

  it('should return default settings if nothing is stored', async () => {
    (getAppDbProvider as any).mockResolvedValue('prisma');
    (prisma.setting.findUnique as any).mockResolvedValue(null);

    const settings = await getCmsThemeSettings();

    expect(settings).toBeDefined();
    // Default values from normalizeThemeSettings
    expect(settings.primaryColor).toBeDefined();
  });
});
