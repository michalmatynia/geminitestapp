/* eslint-disable @typescript-eslint/no-unused-vars -- Relation tree split is in progress and preserves legacy tree mutation helpers. */
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';


import {
  buildRelationCaseNodeId,
  buildRelationCasePath,
  buildRelationFileNodeId,
  buildRelationFolderNodeId,
  buildRelationFolderPath,
  RELATION_TREE_UNASSIGNED_CASE_KEY,
} from './relation-master-tree.helpers';

import type {
  RelationCaseBucket,
  RelationMasterTreeBuildInput,
} from './relation-master-tree.types';
import type { NodeFileDocumentSearchRow } from '../../components/CaseResolverNodeFileUtils';
import type { RelationTreeBuildResult } from '../types';

import { buildRelationMasterTree as buildRelationMasterTreeFromRows } from '@/features/case-resolver/services/tree';

export const buildRelationMasterTree = ({
  rows,
}: RelationMasterTreeBuildInput): RelationTreeBuildResult => buildRelationMasterTreeFromRows(rows);
