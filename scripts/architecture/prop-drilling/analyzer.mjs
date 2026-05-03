import { MAX_CHAIN_COUNT, MAX_CHAIN_DEPTH } from './constants.mjs';

export const toStateKey = (componentId, propName) => `${componentId}::${propName}`;

export const scoreChain = ({ depth, rootFanout, distinctFeatureCount }) => {
  const intermediates = Math.max(depth - 2, 0);
  return (
    depth * 22 +
    intermediates * 17 +
    Math.max(rootFanout - 1, 0) * 10 +
    (depth >= 4 ? 24 : 0) +
    (distinctFeatureCount > 1 ? 6 : 0)
  );
};

export const buildChains = ({ adjacency, componentById }) => {
  const incomingCount = new Map();
  for (const transitions of adjacency.values()) {
    for (const transition of transitions) {
      const nextKey = toStateKey(transition.toComponentId, transition.targetProp);
      incomingCount.set(nextKey, (incomingCount.get(nextKey) ?? 0) + 1);
    }
  }

  const allStates = [...adjacency.keys()];
  const rootStates = allStates.filter((stateKey) => (incomingCount.get(stateKey) ?? 0) === 0);
  const starts = rootStates.length > 0 ? rootStates : allStates;

  const chainByKey = new Map();

  for (const startState of starts) {
    if (chainByKey.size >= MAX_CHAIN_COUNT) break;
    const rootTransitions = adjacency.get(startState) ?? [];
    if (rootTransitions.length === 0) continue;

    const [startComponentId, startProp] = startState.split('::');

    const stack = [
      {
        stateKey: startState,
        componentPath: [startComponentId],
        propPath: [startProp],
        transitionPath: [],
        visitedStates: new Set([startState]),
      },
    ];

    while (stack.length > 0 && chainByKey.size < MAX_CHAIN_COUNT) {
      const current = stack.pop();
      const outgoing = adjacency.get(current.stateKey) ?? [];
      if (outgoing.length === 0) continue;

      for (const transition of outgoing) {
        const nextStateKey = toStateKey(transition.toComponentId, transition.targetProp);
        if (current.visitedStates.has(nextStateKey)) continue;

        const nextComponentPath = [...current.componentPath, transition.toComponentId];
        const nextPropPath = [...current.propPath, transition.targetProp];
        const nextTransitionPath = [...current.transitionPath, transition];
        const nextDepth = nextComponentPath.length;

        if (nextDepth >= 3) {
          const chainKey = `${nextComponentPath.join('>')}::${nextPropPath.join('>')}`;
          if (!chainByKey.has(chainKey)) {
            const distinctFeatureCount = new Set(
              nextComponentPath.map((componentId) => componentById.get(componentId)?.feature ?? 'other')
            ).size;

            const rootFanout = rootTransitions.length;
            const score = scoreChain({
              depth: nextDepth,
              rootFanout,
              distinctFeatureCount,
            });

            chainByKey.set(chainKey, {
              score,
              depth: nextDepth,
              rootFanout,
              distinctFeatureCount,
              rootComponentId: nextComponentPath[0],
              sinkComponentId: nextComponentPath[nextComponentPath.length - 1],
              componentPath: nextComponentPath,
              propPath: nextPropPath,
              transitions: nextTransitionPath,
            });
          }
        }

        if (nextTransitionPath.length >= MAX_CHAIN_DEPTH) continue;

        const nextVisitedStates = new Set(current.visitedStates);
        nextVisitedStates.add(nextStateKey);

        stack.push({
          stateKey: nextStateKey,
          componentPath: nextComponentPath,
          propPath: nextPropPath,
          transitionPath: nextTransitionPath,
          visitedStates: nextVisitedStates,
        });
      }
    }
  }

  return [...chainByKey.values()];
};

export const buildTransitionBacklog = ({ transitions, adjacency, componentById }) =>
  transitions
    .map((transition) => {
      const fromState = toStateKey(transition.fromComponentId, transition.sourceProp);
      const rootFanout = (adjacency.get(fromState) ?? []).length || 1;
      const distinctFeatureCount = new Set([
        componentById.get(transition.fromComponentId)?.feature ?? 'other',
        componentById.get(transition.toComponentId)?.feature ?? 'other',
      ]).size;
      const renamePenalty = transition.sourceProp !== transition.targetProp ? 8 : 0;
      const score =
        scoreChain({
          depth: 2,
          rootFanout,
          distinctFeatureCount,
        }) + renamePenalty;

      return {
        score,
        depth: 2,
        rootFanout,
        distinctFeatureCount,
        rootComponentId: transition.fromComponentId,
        sinkComponentId: transition.toComponentId,
        componentPath: [transition.fromComponentId, transition.toComponentId],
        propPath: [transition.sourceProp, transition.targetProp],
        transitions: [transition],
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.rootFanout !== left.rootFanout) return right.rootFanout - left.rootFanout;
      return right.distinctFeatureCount - left.distinctFeatureCount;
    });
