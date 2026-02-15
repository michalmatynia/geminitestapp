import type { ManagedImageSlot } from '@/features/image-slots';
import { ImageFileRecord } from '@/shared/types/domain/files';

export type ProductImageSlot = ManagedImageSlot;

export type ExpandedImageFile = ImageFileRecord & {
  products: {
    product: {
      id: string;
      name: string;
    };
  }[];
};

export type DebugInfo = {
  action: string;
  message: string;
  slotIndex?: number | undefined;
  filename?: string | undefined;
  timestamp: string;
};

export type ProductListPreferences = {
  nameLocale: 'name_en' | 'name_pl' | 'name_de';
  catalogFilter: string;
  currencyCode: string | null;
  pageSize: number;
  thumbnailSource: 'file' | 'link' | 'base64';
  filtersCollapsedByDefault: boolean;
};
