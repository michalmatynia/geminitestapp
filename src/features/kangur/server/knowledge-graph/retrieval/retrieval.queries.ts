export const GRAPH_QUERY = `
  WITH
    $graphKey AS graphKey,
    $tokens AS tokens,
    toLower(coalesce($surface, '')) AS querySurface,
    toLower(coalesce($focusKind, '')) AS queryFocusKind,
    toLower(coalesce($focusId, '')) AS queryFocusId,
    toLower(coalesce($contentId, '')) AS queryContentId,
    toLower(coalesce($focusLabel, '')) AS queryFocusLabel,
    toLower(coalesce($title, '')) AS queryTitle
  MATCH (n:KangurKnowledgeNode {graphKey: graphKey})
  WITH
    n,
    graphKey,
    tokens,
    querySurface,
    queryFocusKind,
    queryFocusId,
    queryContentId,
    queryFocusLabel,
    queryTitle,
    size([
      token IN tokens
      WHERE toLower(coalesce(n.title, '')) CONTAINS token
         OR toLower(coalesce(n.summary, '')) CONTAINS token
         OR toLower(coalesce(n.semanticText, '')) CONTAINS token
         OR toLower(coalesce(n.id, '')) CONTAINS token
         OR toLower(coalesce(n.anchorId, '')) CONTAINS token
         OR toLower(coalesce(n.route, '')) CONTAINS token
         OR ANY(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS token)
         OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE toLower(phrase) CONTAINS token)
    ]) AS tokenHits,
    reduce(tokenScore = 0, token IN tokens |
      tokenScore +
        CASE
          WHEN toLower(coalesce(n.title, '')) CONTAINS token THEN 18
          WHEN toLower(coalesce(n.summary, '')) CONTAINS token THEN 10
          WHEN toLower(coalesce(n.semanticText, '')) CONTAINS token THEN 12
          WHEN toLower(coalesce(n.id, '')) CONTAINS token THEN 8
          WHEN toLower(coalesce(n.anchorId, '')) CONTAINS token THEN 8
          WHEN toLower(coalesce(n.route, '')) CONTAINS token THEN 6
          WHEN ANY(tag IN coalesce(n.tags, []) WHERE toLower(tag) CONTAINS token) THEN 6
          WHEN ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE toLower(phrase) CONTAINS token) THEN 12
          ELSE 0
        END
    ) AS tokenScore,
    CASE
      WHEN querySurface <> '' AND toLower(coalesce(n.surface, '')) = querySurface THEN 45
      ELSE 0
    END AS surfaceScore,
    CASE
      WHEN queryFocusKind <> '' AND toLower(coalesce(n.focusKind, '')) = queryFocusKind THEN 65
      ELSE 0
    END AS focusKindScore,
    CASE
      WHEN queryFocusId <> '' AND ANY(prefix IN coalesce(n.focusIdPrefixes, []) WHERE toLower(prefix) = queryFocusId) THEN 85
      WHEN queryFocusId <> '' AND ANY(prefix IN coalesce(n.focusIdPrefixes, []) WHERE queryFocusId STARTS WITH toLower(prefix)) THEN 48
      ELSE 0
    END AS focusIdScore,
    CASE
      WHEN queryContentId <> '' AND ANY(prefix IN coalesce(n.contentIdPrefixes, []) WHERE toLower(prefix) = queryContentId) THEN 70
      WHEN queryContentId <> '' AND ANY(prefix IN coalesce(n.contentIdPrefixes, []) WHERE queryContentId STARTS WITH toLower(prefix)) THEN 38
      ELSE 0
    END AS contentIdScore,
    CASE
      WHEN queryFocusLabel <> '' AND (
        toLower(coalesce(n.title, '')) CONTAINS queryFocusLabel
        OR queryFocusLabel CONTAINS toLower(coalesce(n.title, ''))
        OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE queryFocusLabel CONTAINS toLower(phrase))
      ) THEN 26
      ELSE 0
    END AS focusLabelScore,
    CASE
      WHEN queryTitle <> '' AND (
        toLower(coalesce(n.title, '')) CONTAINS queryTitle
        OR queryTitle CONTAINS toLower(coalesce(n.title, ''))
        OR ANY(phrase IN coalesce(n.triggerPhrases, []) WHERE queryTitle CONTAINS toLower(phrase))
      ) THEN 24
      ELSE 0
    END AS titleScore
  WITH
    n,
    tokenHits,
    tokenScore,
    surfaceScore,
    focusKindScore,
    focusIdScore,
    contentIdScore,
    focusLabelScore,
    titleScore,
    (
      tokenScore +
      surfaceScore +
      focusKindScore +
      focusIdScore +
      contentIdScore +
      focusLabelScore +
      titleScore
    ) AS semanticScore,
    graphKey
  WHERE semanticScore > 0 OR tokenHits > 0
  OPTIONAL MATCH (n)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: graphKey})
  OPTIONAL MATCH (m)-[r2:KANGUR_RELATION]->(m2:KangurKnowledgeNode {graphKey: graphKey})
  WHERE m2.id <> n.id
  RETURN
    n.id AS id,
    n.kind AS kind,
    n.title AS title,
    n.summary AS summary,
    n.surface AS surface,
    n.focusKind AS focusKind,
    n.route AS route,
    n.anchorId AS anchorId,
    n.semanticText AS semanticText,
    coalesce(n.embedding, []) AS embedding,
    n.embeddingModel AS embeddingModel,
    n.embeddingDimensions AS embeddingDimensions,
    coalesce(n.focusIdPrefixes, []) AS focusIdPrefixes,
    coalesce(n.contentIdPrefixes, []) AS contentIdPrefixes,
    coalesce(n.triggerPhrases, []) AS triggerPhrases,
    n.sourceCollection AS sourceCollection,
    n.sourceRecordId AS sourceRecordId,
    n.sourcePath AS sourcePath,
    coalesce(n.tags, []) AS tags,
    semanticScore AS semanticScore,
    tokenHits AS tokenHits,
    (collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route,
      hop: 1
    })[0..4] + collect({
      kind: r2.kind,
      targetId: m2.id,
      targetTitle: m2.title,
      targetKind: m2.kind,
      targetAnchorId: m2.anchorId,
      targetRoute: m2.route,
      hop: 2
    })[0..3]) AS relations
  ORDER BY semanticScore DESC, tokenHits DESC, n.title ASC
  LIMIT $limit
`;

export const VECTOR_GRAPH_QUERY = `
  CALL db.index.vector.queryNodes($indexName, $limit, $embedding)
  YIELD node, score
  WHERE node.graphKey = $graphKey
  OPTIONAL MATCH (node)-[r:KANGUR_RELATION]->(m:KangurKnowledgeNode {graphKey: $graphKey})
  OPTIONAL MATCH (m)-[r2:KANGUR_RELATION]->(m2:KangurKnowledgeNode {graphKey: $graphKey})
  WHERE m2.id <> node.id
  RETURN
    node.id AS id,
    node.kind AS kind,
    node.title AS title,
    node.summary AS summary,
    node.surface AS surface,
    node.focusKind AS focusKind,
    node.route AS route,
    node.anchorId AS anchorId,
    node.semanticText AS semanticText,
    coalesce(node.embedding, []) AS embedding,
    node.embeddingModel AS embeddingModel,
    node.embeddingDimensions AS embeddingDimensions,
    coalesce(node.focusIdPrefixes, []) AS focusIdPrefixes,
    coalesce(node.contentIdPrefixes, []) AS contentIdPrefixes,
    coalesce(node.triggerPhrases, []) AS triggerPhrases,
    node.sourceCollection AS sourceCollection,
    node.sourceRecordId AS sourceRecordId,
    node.sourcePath AS sourcePath,
    coalesce(node.tags, []) AS tags,
    toInteger(round(score * 1000.0)) AS semanticScore,
    0 AS tokenHits,
    (collect({
      kind: r.kind,
      targetId: m.id,
      targetTitle: m.title,
      targetKind: m.kind,
      targetAnchorId: m.anchorId,
      targetRoute: m.route,
      hop: 1
    })[0..4] + collect({
      kind: r2.kind,
      targetId: m2.id,
      targetTitle: m2.title,
      targetKind: m2.kind,
      targetAnchorId: m2.anchorId,
      targetRoute: m2.route,
      hop: 2
    })[0..3]) AS relations
  ORDER BY semanticScore DESC, node.title ASC
`;
