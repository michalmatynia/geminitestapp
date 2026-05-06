import type {
  SelectorRegistryEntry,
  SelectorRegistryKind,
  SelectorRegistryNamespace,
  SelectorRegistryRole,
} from '@/shared/contracts/integrations/selector-registry';

export type SelectorRegistryOperationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type RegistryActionType = 'clone' | 'delete' | 'rename' | 'save' | 'sync';
