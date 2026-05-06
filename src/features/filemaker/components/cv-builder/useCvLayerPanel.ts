import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import {
  useMasterFolderTreeControllerViewModel,
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

type CvLayerPanelController = ReturnType<typeof useFolderTreeInstanceV2>;
type UseCvLayerPanelResult = {
  tree: ReturnType<typeof useMasterFolderTreeControllerViewModel>;
  runtime: ReturnType<typeof useSharedMasterFolderTreeRuntime>;
};

const useCvControllerForView = (
  controller: CvLayerPanelController,
  lastExternalSelectedIdRef: MutableRefObject<string | null>,
  onSelectBlockRef: MutableRefObject<(blockId: string | null) => void>
): CvLayerPanelController =>
  useMemo<CvLayerPanelController>(() => {
    const selectedIdRef = lastExternalSelectedIdRef;
    const selectBlockRef = onSelectBlockRef;
    const selectNode: CvLayerPanelController['selectNode'] = (nodeId): void => {
      controller.selectNode(nodeId);
      const selectedId = nodeId ?? null;
      selectedIdRef.current = selectedId;
      selectBlockRef.current(selectedId);
    };
    const nextController: CvLayerPanelController = { ...controller, selectNode };
    return nextController;
  }, [controller, lastExternalSelectedIdRef, onSelectBlockRef]);

const useCvLayerAdapter = (
  blocks: CvBlock[],
  onChange: (next: CvBlock[]) => void
): MasterFolderTreeAdapterV3 => {
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return useMemo<MasterFolderTreeAdapterV3>(
    () =>
      createCvMasterTreeAdapter({
        getBlocks: (): CvBlock[] => blocksRef.current,
        setBlocks: (next: CvBlock[]): void => {
          onChangeRef.current(next);
        },
      }),
    []
  );
};

export function useCvLayerPanel({
  blocks,
  onChange,
  selectedBlockId,
  onSelectBlock,
}: UseCvLayerPanelProps): UseCvLayerPanelResult {
  const onSelectBlockRef = useRef(onSelectBlock);
  onSelectBlockRef.current = onSelectBlock;

  const adapter = useCvLayerAdapter(blocks, onChange);
  const initialNodesRef = useRef<ReturnType<typeof projectCvBlocksToMasterNodes> | null>(null);
  initialNodesRef.current ??= projectCvBlocksToMasterNodes(blocks);
  const initialNodes = initialNodesRef.current;
  const projectedNodes = useMemo(() => projectCvBlocksToMasterNodes(blocks), [blocks]);
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
  const controllerForView = useCvControllerForView(
    controller,
    lastExternalSelectedIdRef,
    onSelectBlockRef
  );

  const lastProjectedSignatureRef = useRef<string>(JSON.stringify(initialNodes));
  useEffect(() => {
    const signature = JSON.stringify(projectedNodes);
    if (signature === lastProjectedSignatureRef.current) return;
    lastProjectedSignatureRef.current = signature;
    void controllerRef.current.replaceNodes(projectedNodes, 'external_sync');
  }, [projectedNodes]);

  useEffect(() => {
    const selectedId = selectedBlockId ?? null;
    if (selectedId === lastExternalSelectedIdRef.current) return;
    lastExternalSelectedIdRef.current = selectedId;

    const controllerSelectedNodeId = controllerRef.current.selectedNodeId ?? null;
    if (selectedId !== controllerSelectedNodeId) {
      controllerRef.current.selectNode(selectedId);
    }
  }, [selectedBlockId]);

  const tree = useMasterFolderTreeControllerViewModel({
    controller: controllerForView,
    profile: cvBuilderTreeProfile,
    nodes: projectedNodes,
  });

  return { tree, runtime };
}
