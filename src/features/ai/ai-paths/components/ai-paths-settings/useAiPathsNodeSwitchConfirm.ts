import { useCallback } from 'react';

type ConfirmFn = (input: {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDangerous: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) => void;

type ToastFn = (
  message: string,
  options?: {
    variant?: 'info' | 'success' | 'warning' | 'error';
  }
) => void;

type UseAiPathsNodeSwitchConfirmInput = {
  configOpen: boolean;
  nodeConfigDirty: boolean;
  selectedNodeId: string | null;
  setNodeConfigDirty: (dirty: boolean) => void;
  confirm: ConfirmFn;
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
