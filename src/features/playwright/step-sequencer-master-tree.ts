/**
 * Master Folder Tree adapter for the Playwright Step Sequencer Action Constructor.
 *
 * Tree layout:
 *   root
 *   ├── folder (website or "Shared")
 *   │   ├── folder (flow, optional)
 *   │   │   └── step_set  (leaf)
 *   │   └── step_set  (leaf)
 *   └── ...
 */

import type { MasterTreeNode } from '@/shared/contracts/master-folder-tree';
import type { PlaywrightStepSet } from '@/shared/contracts/playwright-steps';

// ---------------------------------------------------------------------------
// Node-ID encoding
// ---------------------------------------------------------------------------

export type StepSequencerNodeEntity = 'folder' | 'step_set';

export const STEP_SEQ_FOLDER_PREFIX = 'ss_folder__';
export const STEP_SEQ_STEP_SET_PREFIX = 'ss_stepset__';

export function encodeStepSeqFolderNodeId(folderId: string): string {
  return `${STEP_SEQ_FOLDER_PREFIX}${folderId}`;
}

export function encodeStepSeqStepSetNodeId(stepSetId: string): string {
  return `${STEP_SEQ_STEP_SET_PREFIX}${stepSetId}`;
}

export function decodeStepSeqNodeId(
  nodeId: string
): { entity: StepSequencerNodeEntity; id: string } | null {
  if (nodeId.startsWith(STEP_SEQ_FOLDER_PREFIX)) {
    return { entity: 'folder', id: nodeId.slice(STEP_SEQ_FOLDER_PREFIX.length) };
  }
  if (nodeId.startsWith(STEP_SEQ_STEP_SET_PREFIX)) {
    return { entity: 'step_set', id: nodeId.slice(STEP_SEQ_STEP_SET_PREFIX.length) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tree node builders
// ---------------------------------------------------------------------------

const SHARED_FOLDER_ID = '__shared__';

function makeFolderNode(
  id: string,
  name: string,
  parentId: string | null,
  sortOrder: number
): MasterTreeNode {
  return {
    id: encodeStepSeqFolderNodeId(id),
    type: 'folder',
    kind: 'folder',
    parentId: parentId ? encodeStepSeqFolderNodeId(parentId) : null,
    name,
    path: name,
    sortOrder,
  };
}

function makeStepSetNode(
  stepSet: PlaywrightStepSet,
  parentFolderId: string,
  sortOrder: number
): MasterTreeNode {
  return {
    id: encodeStepSeqStepSetNodeId(stepSet.id),
    type: 'file',
    kind: 'step_set',
    parentId: encodeStepSeqFolderNodeId(parentFolderId),
    name: stepSet.name,
    path: stepSet.name,
    sortOrder,
    metadata: {
      stepSetId: stepSet.id,
      websiteId: stepSet.websiteId,
      flowId: stepSet.flowId,
      shared: stepSet.shared,
      stepCount: stepSet.stepIds.length,
      tags: stepSet.tags,
    },
  };
}

// ---------------------------------------------------------------------------
// Build full node list from step sets
// ---------------------------------------------------------------------------

export interface StepSeqWebsiteInfo {
  id: string;
  name: string;
}

export interface StepSeqFlowInfo {
  id: string;
  name: string;
  websiteId: string;
}

export interface BuildStepSequencerMasterNodesInput {
  stepSets: PlaywrightStepSet[];
  websites: StepSeqWebsiteInfo[];
  flows: StepSeqFlowInfo[];
}

export function buildStepSequencerMasterNodes({
  stepSets,
  websites,
  flows,
}: BuildStepSequencerMasterNodesInput): MasterTreeNode[] {
  const nodes: MasterTreeNode[] = [];

  // --- Shared folder (top-level) ---
  const sharedSets = stepSets.filter((s) => s.shared || s.websiteId === null);
  nodes.push(makeFolderNode(SHARED_FOLDER_ID, 'Shared', null, 0));

  sharedSets.forEach((ss, idx) => {
    nodes.push(makeStepSetNode(ss, SHARED_FOLDER_ID, idx));
  });

  // --- Website folders ---
  websites.forEach((website, wIdx) => {
    nodes.push(makeFolderNode(website.id, website.name, null, wIdx + 1));

    // Step sets directly under this website (no flow)
    const siteSetsNoFlow = stepSets.filter(
      (s) => s.websiteId === website.id && s.flowId === null && !s.shared
    );
    siteSetsNoFlow.forEach((ss, idx) => {
      nodes.push(makeStepSetNode(ss, website.id, idx));
    });

    // Flow sub-folders
    const siteFlows = flows.filter((f) => f.websiteId === website.id);
    siteFlows.forEach((flow, fIdx) => {
      const flowFolderId = `${website.id}__flow__${flow.id}`;
      nodes.push(makeFolderNode(flowFolderId, flow.name, website.id, fIdx + 1000));

      const flowSets = stepSets.filter(
        (s) => s.websiteId === website.id && s.flowId === flow.id
      );
      flowSets.forEach((ss, idx) => {
        nodes.push(makeStepSetNode(ss, flowFolderId, idx));
      });
    });
  });

  return nodes;
}
