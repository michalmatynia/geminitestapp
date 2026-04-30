import type {
  ProductSyncFieldRule,
  ProductSyncProfile,
} from '@/shared/contracts/product-sync';

import type { BulkSyncLabel } from './ProductBulkSyncSetupModal.helpers';

export interface ProductBulkSyncSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  isRunning: boolean;
  onStart: (profileId: string) => void;
}

export interface ProductBulkSyncRuleSummary {
  appToBaseCount: number;
  baseToAppCount: number;
  disabledCount: number;
}

export interface ProductBulkSyncSetupController extends ProductBulkSyncSetupModalProps {
  connectionLabel: BulkSyncLabel | null;
  directionRules: ProductSyncFieldRule[];
  handleStart: () => void;
  inventoryLabel: BulkSyncLabel;
  options: Array<{ value: string; label: string }>;
  priceGroupLabels: Map<string, string>;
  profileId: string;
  profiles: ProductSyncProfile[];
  profilesLoading: boolean;
  ruleSummary: ProductBulkSyncRuleSummary;
  selectedProfile: ProductSyncProfile | null;
  setProfileId: (value: string) => void;
  warehouseLabels: Map<string, string>;
}
