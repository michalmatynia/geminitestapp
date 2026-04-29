import { useEffect, useMemo, useRef } from 'react';

import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import {
  useFolderTreeInstanceV2,
  useSharedMasterFolderTreeRuntime,
} from '@/shared/lib/foldertree/public';

import type { CvBlock } from './cv-block-model';
import { createCvMasterTreeAdapter } from './cv-master-tree-adapter';
import { projectCvBlocksToMasterNodes } from './cv-master-tree';
import { cvBuilderTreeProfile } from './cv-tree-profile';

interface UseCvLayerPanelProps {
  blocks: CvBlock[];
  onChange: (next: CvBlock[]) => void;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
}

type UseCvLayerPanelResult = {
  controller: ReturnType<typeof useFolderTreeInstanceV2>;
  runtime: ReturnType<typeof useSharedMasterFolderTreeRuntime>;
};

export function useCvLayerPanel({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
}: UseCvLayerPanelProps): UseCvLayerPanelResult {
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSelectBlockRef = useRef(onSelectBlock);
  onSelectBlockRef.current = onSelectBlock;

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () =>
      createCvMasterTreeAdapter({
        getBlocks: (): CvBlock[] => blocksRef.current,
        setBlocks: (next: CvBlock[]): void => {
          onChangeRef.current(next);
        },
      }),
    []
  );

  const initialNodes = useMemo(() => projectCvBlocksToMasterNodes(blocksRef.current), []);
  const runtime = useSharedMasterFolderTreeRuntime({ bindWindowKeydown: false });
  const controller = useFolderTreeInstanceV2({
    adapter,
    profile: cvBuilderTreeProfile,
    initialNodes,
    instanceId: 'filemaker_cv_builder',
    runtime,
  });
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const lastExternalSelectedIdRef = useRef<string | null>(selectedBlockId ?? null);
  const controllerForView = useMemo<ReturnType<typeof useFolderTreeInstanceV2>>(
    () =>
      ({
        ...controller,
        selectNode: (nodeId: Parameters<typeof controller.selectNode>[0]) => {
          const result = controller.selectNode(nodeId);
          const selectedId = nodeId ?? null;
          lastExternalSelectedIdRef.current = selectedId;
          onSelectBlockRef.current(selectedId);
          return result;
        },
      }) as ReturnType<typeof useFolderTreeInstanceV2>,
    [controller]
  );

  const lastProjectedSignatureRef = useRef<string>(JSON.stringify(initialNodes));
  useEffect(() => {
    const projected = projectCvBlocksToMasterNodes(blocks);
    const signature = JSON.stringify(projected);
    if (signature === lastProjectedSignatureRef.current) return;
    lastProjectedSignatureRef.current = signature;
    void controllerRef.current.replaceNodes(projected, 'external_sync');
  }, [blocks]);

  useEffect(() => {
    const selectedId = selectedBlockId ?? null;
    if (selectedId === lastExternalSelectedIdRef.current) return;
    lastExternalSelectedIdRef.current = selectedId;

    const controllerSelectedNodeId = controllerRef.current.selectedNodeId ?? null;
    if (selectedId !== controllerSelectedNodeId) {
      controllerRef.current.selectNode(selectedId);
    }
  }, [selectedBlockId]);

  return { controller: controllerForView, runtime };
}
