import type { ManagedImageSlot } from '@/features/image-slots';
import { ImageFileRecord } from '@/shared/types/domain/files';
import type { ProductListPreferencesDto } from '@/shared/contracts/products';

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

export type ProductListPreferences = ProductListPreferencesDto;
