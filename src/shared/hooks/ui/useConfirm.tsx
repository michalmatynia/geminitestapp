'use client';

import { useState, useCallback } from 'react';

import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

type UseConfirmResult = {
  confirm: (newConfig: ConfirmConfig) => void;
  ConfirmationModal: () => React.JSX.Element | null;
  isPending: boolean;
};

/**
 * Hook for managing confirmation modal state.
 * Returns a function to trigger confirmation and the modal component to render.
 */
export function useConfirm(): UseConfirmResult {
  const [config, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((newConfig: ConfirmConfig) => {
    setConfirmConfig(newConfig);
  }, []);

  const handleClose = useCallback(() => {
    if (config?.onCancel) config.onCancel();
    setConfirmConfig(null);
  }, [config]);

  const handleConfirm = useCallback(async () => {
    if (config?.onConfirm) {
      setIsLoading(true);
      try {
        await config.onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    setConfirmConfig(null);
  }, [config]);

  const ConfirmationModal = useCallback(() => {
    if (!config) return null;

    return (
      <ConfirmModal
        isOpen={Boolean(config)}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText ?? 'Confirm'}
        cancelText={config.cancelText ?? 'Cancel'}
        isDangerous={config.isDangerous ?? false}
        loading={isLoading}
      />
    );
  }, [config, handleClose, handleConfirm, isLoading]);

  return {
    confirm,
    ConfirmationModal,
    isPending: isLoading,
  };
}
