import { useEffect, useMemo, useRef } from 'react';
import {
  useFolderTreeInstanceV2,
  useSharedMasterFolderTreeRuntime,
} from '@/shared/lib/foldertree/public';
import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import type { EmailBlock } from './block-model';
import { createEmailMasterTreeAdapter } from './email-master-tree-adapter';
import { projectBlocksToMasterNodes } from './email-master-tree';
import { emailBuilderTreeProfile } from './email-tree-profile';

interface UseEmailLayerPanelProps {
  blocks: EmailBlock[];
  onChange: (next: EmailBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
}

export function useEmailLayerPanel({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
}: UseEmailLayerPanelProps) {
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () =>
      createEmailMasterTreeAdapter({
        getBlocks: (): EmailBlock[] => blocksRef.current,
        setBlocks: (next: EmailBlock[]): void => {
          onChangeRef.current(next);
        },
      }),
    []
  );

  const initialNodes = useMemo(() => projectBlocksToMasterNodes(blocksRef.current), []);
  const runtime = useSharedMasterFolderTreeRuntime({ bindWindowKeydown: false });
  const controller = useFolderTreeInstanceV2({
    adapter,
    profile: emailBuilderTreeProfile,
    initialNodes,
    instanceId: 'filemaker_email_builder',
    runtime,
  });

  const lastProjectedSignatureRef = useRef<string>(JSON.stringify(initialNodes));
  useEffect(() => {
    const projected = projectBlocksToMasterNodes(blocks);
    const signature = JSON.stringify(projected);
    if (signature === lastProjectedSignatureRef.current) return;
    lastProjectedSignatureRef.current = signature;
    void controller.replaceNodes(projected, 'external_sync');
  }, [blocks, controller]);

  useEffect(() => {
    if (controller.selectedNodeId !== selectedBlockId) {
      onSelectBlock(controller.selectedNodeId);
    }
  }, [controller.selectedNodeId, selectedBlockId, onSelectBlock]);

  useEffect(() => {
    if (selectedBlockId !== controller.selectedNodeId) {
      controller.selectNode(selectedBlockId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlockId]);

  return { controller, runtime };
}
