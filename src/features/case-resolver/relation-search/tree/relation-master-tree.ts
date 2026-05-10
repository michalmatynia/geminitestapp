import type { RelationMasterTreeBuildInput } from './relation-master-tree.types';
import type { RelationTreeBuildResult } from '../types';

import {
  buildRelationMasterTree as buildRelationMasterTreeFromRows,
} from '@/features/case-resolver/services/tree/relation-builder-service';

const buildTypedRelationMasterTree = buildRelationMasterTreeFromRows as (
  rows: RelationMasterTreeBuildInput['rows']
) => RelationTreeBuildResult;

export const buildRelationMasterTree = ({
  rows,
}: RelationMasterTreeBuildInput): RelationTreeBuildResult => buildTypedRelationMasterTree(rows);
