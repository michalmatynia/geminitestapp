import type { ImageFileSelection } from './files';
import type { ManagedImageSlot as ProductImageSlot } from './image-slots';

export interface ProductImageManagerController {
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  setImageLinkAt: (index: number, value: string) => void;
  setImageBase64At: (index: number, value: string) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect?: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  setShowFileManager: (show: boolean) => void;
  setShowFileManagerForSlot?: (index: number) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImagesReordering: (reordering: boolean) => void;
  isSlotImageLocked?: (index: number) => boolean;
  slotImageLockedReason?: string;
  slotLabels?: string[];
  uploadError?: string | null;
  temporaryObjectUpload?: unknown; // To be refined if needed
}
