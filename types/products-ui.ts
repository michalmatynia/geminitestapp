import { ImageFileRecord, ImageFileSelection } from "./index";

export type ProductImageSlot =
  | {
      type: "file"; // A new File object
      data: File;
      previewUrl: string;
      originalIndex?: number; // Optional: original index if moved
    }
  | {
      type: "existing"; // An existing ImageFile from the DB
      data: ImageFileSelection;
      previewUrl: string; // The filepath of the existing image
      originalIndex?: number; // Optional: original index if moved
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
  slotIndex?: number;
  filename?: string;
  timestamp: string;
};
