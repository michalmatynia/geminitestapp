export const NODE_MIGRATION_READINESS_STAGES = [
  'not_ready',
  'cataloged',
  'scaffolded',
  'runtime_kernel_indexed',
  'rollout_candidate',
  'rollout_approved',
] as const;

export type NodeMigrationReadinessStage = (typeof NODE_MIGRATION_READINESS_STAGES)[number];

export const NODE_MIGRATION_READINESS_STAGE_SCORE: Record<NodeMigrationReadinessStage, number> = {
  not_ready: 0,
  cataloged: 35,
  scaffolded: 60,
  runtime_kernel_indexed: 80,
  rollout_candidate: 90,
  rollout_approved: 100,
};

export const NODE_MIGRATION_READINESS_BLOCKER_CODES = [
  'missing_semantic_contract_hash',
  'missing_v2_object_contract',
  'missing_v3_scaffold',
  'not_in_runtime_kernel',
  'missing_v3_object_artifacts',
  'parity_not_validated',
  'rollout_not_approved',
] as const;

export type NodeMigrationReadinessBlockerCode =
  (typeof NODE_MIGRATION_READINESS_BLOCKER_CODES)[number];

export type NodeMigrationReadinessChecklist = {
  semanticContractReviewed: boolean;
  v3CodeObjectAuthored: boolean;
  dualRunParityValidated: boolean;
  rolloutApproved: boolean;
};

export type NodeMigrationReadiness = {
  stage: NodeMigrationReadinessStage;
  score: number;
  blockers: NodeMigrationReadinessBlockerCode[];
};

export type NodeMigrationReadinessInput = {
  runtimeStrategy: 'legacy_adapter' | 'code_object_v3';
  hasSemanticContractHash: boolean;
  hasV2ObjectContract: boolean;
  hasV3Scaffold: boolean;
  hasV3ObjectArtifacts: boolean;
  checklist: NodeMigrationReadinessChecklist;
};

export type NodeMigrationReadinessSummary = {
  totalsByStage: Record<NodeMigrationReadinessStage, number>;
  averageScore: number;
  blockers: Array<{
    code: NodeMigrationReadinessBlockerCode;
    count: number;
  }>;
};

const cloneBlockers = (
  blockers: Set<NodeMigrationReadinessBlockerCode>
): NodeMigrationReadinessBlockerCode[] =>
  Array.from(blockers).sort((left, right) => left.localeCompare(right));

export const computeNodeMigrationReadiness = (
  input: NodeMigrationReadinessInput
): NodeMigrationReadiness => {
  const blockers = new Set<NodeMigrationReadinessBlockerCode>();

  if (!input.hasSemanticContractHash) {
    blockers.add('missing_semantic_contract_hash');
  }
  if (!input.hasV2ObjectContract) {
    blockers.add('missing_v2_object_contract');
  }
  if (!input.hasV3Scaffold) {
    blockers.add('missing_v3_scaffold');
  }

  if (input.runtimeStrategy !== 'code_object_v3') {
    blockers.add('not_in_runtime_kernel');
  } else if (!input.hasV3ObjectArtifacts) {
    blockers.add('missing_v3_object_artifacts');
  } else if (!input.checklist.dualRunParityValidated) {
    blockers.add('parity_not_validated');
  } else if (!input.checklist.rolloutApproved) {
    blockers.add('rollout_not_approved');
  }

  let stage: NodeMigrationReadinessStage = 'not_ready';
  if (input.hasSemanticContractHash && input.hasV2ObjectContract) {
    stage = 'cataloged';
  }
  if (stage !== 'not_ready' && input.hasV3Scaffold) {
    stage = 'scaffolded';
  }
  if (
    stage === 'scaffolded' &&
    input.runtimeStrategy === 'code_object_v3' &&
    input.hasV3ObjectArtifacts
  ) {
    stage = 'runtime_kernel_indexed';
  }
  if (stage === 'runtime_kernel_indexed' && input.checklist.dualRunParityValidated) {
    stage = 'rollout_candidate';
  }
  if (stage === 'rollout_candidate' && input.checklist.rolloutApproved) {
    stage = 'rollout_approved';
  }

  return {
    stage,
    score: NODE_MIGRATION_READINESS_STAGE_SCORE[stage],
    blockers: cloneBlockers(blockers),
  };
};

export const summarizeNodeMigrationReadiness = (
  readinessList: NodeMigrationReadiness[]
): NodeMigrationReadinessSummary => {
  const totalsByStage = NODE_MIGRATION_READINESS_STAGES.reduce(
    (accumulator, stage) => {
      accumulator[stage] = 0;
      return accumulator;
    },
    {} as Record<NodeMigrationReadinessStage, number>
  );

  const blockerCounts = new Map<NodeMigrationReadinessBlockerCode, number>();
  let totalScore = 0;

  for (const readiness of readinessList) {
    totalsByStage[readiness.stage] += 1;
    totalScore += readiness.score;
    for (const blocker of readiness.blockers) {
      blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
    }
  }

  const averageScore = readinessList.length > 0 ? Math.round(totalScore / readinessList.length) : 0;

  const blockers = Array.from(blockerCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) =>
      right.count === left.count ? left.code.localeCompare(right.code) : right.count - left.count
    );

  return {
    totalsByStage,
    averageScore,
    blockers,
  };
};
