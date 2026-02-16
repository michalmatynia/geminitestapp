'use client';

import { useState, useCallback } from 'react';
import { PromptModal } from '@/shared/ui/templates/modals/PromptModal';

export interface PromptConfig {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  required?: boolean;
  onConfirm?: (value: string) => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Hook for managing prompt modal state.
 * Returns a function to trigger prompt and the modal component to render.
 */
export function usePrompt() {
  const [config, setPromptConfig] = useState<PromptConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const prompt = useCallback((newConfig: PromptConfig) => {
    setPromptConfig(newConfig);
  }, []);

  const handleClose = useCallback(() => {
    if (config?.onCancel) config.onCancel();
    setPromptConfig(null);
  }, [config]);

  const handleConfirm = useCallback(async (value: string) => {
    if (config?.onConfirm) {
      setIsLoading(true);
      try {
        await config.onConfirm(value);
      } finally {
        setIsLoading(false);
      }
    }
    setPromptConfig(null);
  }, [config]);

  const PromptInputModal = useCallback(() => {
    if (!config) return null;

    return (
      <PromptModal
        open={Boolean(config)}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={config.title}
        message={config.message ?? ''}
        label={config.label ?? ''}
        defaultValue={config.defaultValue ?? ''}
        placeholder={config.placeholder ?? ''}
        confirmText={config.confirmText ?? 'Confirm'}
        cancelText={config.cancelText ?? 'Cancel'}
        required={config.required ?? false}
        isLoading={isLoading}
      />
    );
  }, [config, handleClose, handleConfirm, isLoading]);

  return {
    prompt,
    PromptInputModal,
    isPending: isLoading
  };
}
