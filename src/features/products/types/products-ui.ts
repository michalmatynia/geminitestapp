import { ImageFileRecord, ImageFileSelection } from "@/types/index";

export type ProductImageSlot =
  | {
      type: "file"; // A new File object
      data: File;
      previewUrl: string;
      slotId: string;
      originalIndex?: number | undefined; // Optional: original index if moved
    }
  | {
      type: "existing"; // An existing ImageFile from the DB
      data: ImageFileSelection;
      previewUrl: string; // The filepath of the existing image
      slotId: string;
      originalIndex?: number | undefined; // Optional: original index if moved
    }
  | null; // Empty slot

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
  nameLocale: "name_en" | "name_pl" | "name_de";
  catalogFilter: string;
  currencyCode: string | null;
  pageSize: number;
};

export type ProductAiJobsPanelProps = {
  title?: string;
  description?: string;
  showTabs?: boolean;
};
