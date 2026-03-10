
import type { ProductImageManagerController } from '@/shared/contracts/product-image-manager';
import type { DebugInfo } from '@/shared/contracts/products';

import type { DragEvent } from 'react';

export type SlotViewMode = 'upload' | 'link' | 'base64';

export interface ProductImageManagerUIContextValue {
  slotViewModes: SlotViewMode[];
  base64LoadingSlots: Record<number, boolean>;
  linkToFileLoadingSlots: Record<number, boolean>;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  isReordering: boolean;
  debugInfo: DebugInfo | null;
  showDebug: boolean;
  externalBaseUrl: string;
  minimalUi: boolean;
  showDragHandle: boolean;
  minimalSingleSlotAlign: 'left' | 'center';
  controller: ProductImageManagerController;
  setSlotViewMode: (index: number, mode: SlotViewMode) => void;
  setShowDebug: (show: boolean) => void;
  pushDebug: (info: Omit<DebugInfo, 'timestamp'>) => void;
  convertSlotToBase64: (index: number) => Promise<void>;
  convertAllSlotsToBase64: () => Promise<void>;
  convertLinkToFile: (index: number) => Promise<void>;
  triggerFileManager: (index: number) => void;
  handleSlotFileUpload: (index: number, files: File[]) => void;
  clearVisibleImage: (index: number) => Promise<void>;
  handleDragStart: (e: DragEvent<HTMLDivElement>, index: number) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>, toIndex: number) => void;
}

export type ProductImageManagerUIStateContextValue = Omit<
  ProductImageManagerUIContextValue,
  | 'setSlotViewMode'
  | 'setShowDebug'
  | 'pushDebug'
  | 'convertSlotToBase64'
  | 'convertAllSlotsToBase64'
  | 'convertLinkToFile'
  | 'triggerFileManager'
  | 'handleSlotFileUpload'
  | 'clearVisibleImage'
  | 'handleDragStart'
  | 'handleDragEnd'
  | 'handleDragOver'
  | 'handleDragLeave'
  | 'handleDrop'
>;

export type ProductImageManagerUIActionsContextValue = Pick<
  ProductImageManagerUIContextValue,
  | 'setSlotViewMode'
  | 'setShowDebug'
  | 'pushDebug'
  | 'convertSlotToBase64'
  | 'convertAllSlotsToBase64'
  | 'convertLinkToFile'
  | 'triggerFileManager'
  | 'handleSlotFileUpload'
  | 'clearVisibleImage'
  | 'handleDragStart'
  | 'handleDragEnd'
  | 'handleDragOver'
  | 'handleDragLeave'
  | 'handleDrop'
>;
