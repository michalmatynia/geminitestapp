export type SelectorRegistryOperationResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export type RegistryActionType = 'clone' | 'delete' | 'rename' | 'save' | 'sync';
