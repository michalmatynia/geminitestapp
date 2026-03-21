import { useCallback } from 'react';
import type { Toast as ToastFn } from '@/shared/contracts/ui';
import type { ConfirmConfig } from '@/shared/hooks/ui/useConfirm';

type UseAiPathsNodeSwitchConfirmInput = {
  configOpen: boolean;
  nodeConfigDirty: boolean;
  selectedNodeId: string | null;
  setNodeConfigDirty: (dirty: boolean) => void;
  confirm: (config: ConfirmConfig) => void;
  toast: ToastFn;
};

export type UseAiPathsNodeSwitchConfirmReturn = {
  confirmNodeSwitch: (nextNodeId: string) => boolean | Promise<boolean>;
};

export function useAiPathsNodeSwitchConfirm({
  configOpen,
  nodeConfigDirty,
  selectedNodeId,
  setNodeConfigDirty,
  confirm,
  toast,
}: UseAiPathsNodeSwitchConfirmInput): UseAiPathsNodeSwitchConfirmReturn {
  const confirmNodeSwitch = useCallback(
    (nextNodeId: string): boolean | Promise<boolean> => {
      if (!configOpen || !nodeConfigDirty) return true;
      if (nextNodeId === selectedNodeId) return true;

      return new Promise((resolve) => {
        confirm({
          title: 'Unsaved Changes',
          message: 'You have unsaved changes for this node. Discard them and switch?',
          confirmText: 'Discard & Switch',
          cancelText: 'Keep Editing',
          isDangerous: true,
          onConfirm: () => {
            setNodeConfigDirty(false);
            resolve(true);
          },
          onCancel: () => {
            toast('Kept current node.', { variant: 'info' });
            resolve(false);
          },
        });
      });
    },
    [configOpen, confirm, nodeConfigDirty, selectedNodeId, setNodeConfigDirty, toast]
  );

  return { confirmNodeSwitch };
}
