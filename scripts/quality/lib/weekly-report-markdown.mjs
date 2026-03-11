const formatPercent = (numerator, denominator) => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 'n/a';
  }

  return `${Number(((numerator / denominator) * 100).toFixed(1))}%`;
};

const formatKnownPercent = (value) => (Number.isFinite(value) ? `${Number(value)}%` : null);

export const buildKangurAiTutorBridgeSnapshotLines = (snapshot) => {
  if (!snapshot) {
    return ['- Kangur AI Tutor bridge snapshot unavailable; inspect JSON payload for error details.'];
  }

  const completionRate =
    snapshot.bridgeCompletionRatePercent === null ? 'n/a' : `${snapshot.bridgeCompletionRatePercent}%`;
  const vectorAssistCount =
    (Number.isFinite(snapshot.knowledgeGraphHybridRecallCount)
      ? snapshot.knowledgeGraphHybridRecallCount
      : 0) +
    (Number.isFinite(snapshot.knowledgeGraphVectorOnlyRecallCount)
      ? snapshot.knowledgeGraphVectorOnlyRecallCount
      : 0);
  const graphCoverageRate =
    formatKnownPercent(snapshot.knowledgeGraphCoverageRatePercent) ??
    formatPercent(snapshot.knowledgeGraphAppliedCount, snapshot.messageSucceededCount);
  const vectorAssistRate =
    formatKnownPercent(snapshot.knowledgeGraphVectorAssistRatePercent) ??
    formatPercent(vectorAssistCount, snapshot.knowledgeGraphSemanticCount);

  return [
    `- Range: ${snapshot.range}`,
    `- Overall status: ${snapshot.overallStatus}`,
    `- Tutor replies: ${snapshot.messageSucceededCount}`,
    `- Neo4j-backed replies: ${snapshot.knowledgeGraphAppliedCount}`,
    `- Graph coverage rate: ${graphCoverageRate}`,
    `- Graph mode split: semantic=${snapshot.knowledgeGraphSemanticCount} | website-help=${snapshot.knowledgeGraphWebsiteHelpCount}`,
    `- Recall mix: metadata=${snapshot.knowledgeGraphMetadataOnlyRecallCount} | hybrid=${snapshot.knowledgeGraphHybridRecallCount} | vector-only=${snapshot.knowledgeGraphVectorOnlyRecallCount}`,
    `- Vector assist rate: ${vectorAssistRate} | attempts=${snapshot.knowledgeGraphVectorRecallAttemptedCount}`,
    `- Bridge suggestions: ${snapshot.bridgeSuggestionCount}`,
    `- Direction split: lesson->game=${snapshot.lessonToGameBridgeSuggestionCount} | game->lesson=${snapshot.gameToLessonBridgeSuggestionCount}`,
    `- Bridge CTA clicks: ${snapshot.bridgeQuickActionClickCount}`,
    `- Bridge follow-up opens: ${snapshot.bridgeFollowUpClickCount}`,
    `- Bridge completions: ${snapshot.bridgeFollowUpCompletionCount}`,
    `- Bridge completion rate: ${completionRate} | alert=${snapshot.alertStatus ?? 'n/a'}`,
  ];
};

export const buildKangurKnowledgeGraphStatusLines = (snapshot) => {
  if (!snapshot) {
    return ['- Kangur knowledge graph status unavailable; inspect JSON payload for error details.'];
  }

  if (snapshot.mode === 'disabled') {
    return [
      '- Mode: disabled',
      `- Message: ${snapshot.message}`,
    ];
  }

  if (snapshot.mode === 'error') {
    return [
      '- Mode: error',
      `- Message: ${snapshot.message}`,
    ];
  }

  const vectorIndexSummary = snapshot.vectorIndexPresent
    ? `${snapshot.vectorIndexType ?? 'unknown'} / ${snapshot.vectorIndexState ?? 'unknown'} / dims=${snapshot.vectorIndexDimensions ?? 'n/a'}`
    : 'absent';
  const embeddingModels =
    Array.isArray(snapshot.embeddingModels) && snapshot.embeddingModels.length > 0
      ? snapshot.embeddingModels.join(', ')
      : 'n/a';

  return [
    `- Semantic readiness: ${snapshot.semanticReadiness}`,
    `- Graph present: ${snapshot.present ? 'yes' : 'no'} | locale=${snapshot.locale ?? 'n/a'} | graphKey=${snapshot.graphKey}`,
    `- Synced at: ${snapshot.syncedAt ?? 'n/a'}`,
    `- Live graph: nodes=${snapshot.liveNodeCount} | edges=${snapshot.liveEdgeCount}`,
    `- Synced graph: nodes=${snapshot.syncedNodeCount ?? 'n/a'} | edges=${snapshot.syncedEdgeCount ?? 'n/a'}`,
    `- Canonical integrity: valid=${snapshot.validCanonicalNodeCount ?? 'n/a'} | invalid=${snapshot.invalidCanonicalNodeCount ?? 'n/a'}`,
    `- Semantic coverage: ${formatKnownPercent(snapshot.semanticCoverageRatePercent) ?? 'n/a'} | semantic nodes=${snapshot.semanticNodeCount}`,
    `- Embedding coverage: ${formatKnownPercent(snapshot.embeddingCoverageRatePercent) ?? 'n/a'} | embedding nodes=${snapshot.embeddingNodeCount}`,
    `- Embedding details: dimensions=${snapshot.embeddingDimensions ?? 'n/a'} | models=${embeddingModels}`,
    `- Vector index: ${vectorIndexSummary}`,
  ];
};
