'use client';

import { useState, useCallback } from 'react';

import { PromptModal } from '@/shared/ui/templates/modals/PromptModal';

export interface PromptModalConfig {
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

export interface UsePromptReturn {
  prompt: (newConfig: PromptModalConfig) => Promise<string | null>;
  PromptInputModal: () => React.JSX.Element | null;
  isPending: boolean;
}

/**
 * Hook for managing prompt modal state.
 * Returns a function to trigger prompt and the modal component to render.
 */
export function usePrompt(): UsePromptReturn {
  const [config, setPromptConfig] = useState<
    (PromptModalConfig & { resolve: (value: string | null) => void }) | null
      >(null);
  const [isLoading, setIsLoading] = useState(false);

  const prompt = useCallback((newConfig: PromptModalConfig) => {
    return new Promise<string | null>((resolve) => {
      setPromptConfig({
        ...newConfig,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (config?.onCancel) config.onCancel();
    config?.resolve(null);
    setPromptConfig(null);
  }, [config]);

  const handleConfirm = useCallback(
    async (value: string) => {
      if (config?.onConfirm) {
        setIsLoading(true);
        try {
          await config.onConfirm(value);
        } finally {
          setIsLoading(false);
        }
      }
      config?.resolve(value);
      setPromptConfig(null);
    },
    [config]
  );

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
    isPending: isLoading,
  };
}
