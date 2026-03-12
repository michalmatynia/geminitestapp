import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('getCmsThemeSettings Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['MONGODB_URI'];
  });

  it('should fetch theme settings from MongoDB when configured', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
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

  it('should return default settings if nothing is stored in MongoDB', async () => {
    process.env['MONGODB_URI'] = 'mongodb://localhost';
    const mockCollection = {
      findOne: vi.fn().mockResolvedValue(null),
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue(mockCollection),
    };
    (getMongoDb as any).mockResolvedValue(mockDb);

    const settings = await getCmsThemeSettings();

    expect(settings).toBeDefined();
    expect(settings.primaryColor).toBeDefined();
  });

  it('should return default settings when MongoDB is not configured', async () => {
    const settings = await getCmsThemeSettings();

    expect(getMongoDb).not.toHaveBeenCalled();
    expect(settings).toBeDefined();
    expect(settings.primaryColor).toBeDefined();
  });
});
