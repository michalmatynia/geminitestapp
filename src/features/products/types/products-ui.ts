import type { ImageFileRecordDto as ImageFileRecord } from '@/shared/contracts/files';
import type { ManagedImageSlotDto as ManagedImageSlot } from '@/shared/contracts/image-slots';
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
