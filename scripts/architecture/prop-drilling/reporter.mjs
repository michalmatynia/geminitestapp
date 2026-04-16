import { TOP_BACKLOG_LIMIT, TOP_COMPONENT_BACKLOG_LIMIT } from './constants.mjs';

export const toCsvLine = (fields) =>
  fields
    .map((field) => {
      const value = String(field ?? '');
      if (!/[",\n]/.test(value)) return value;
      return `"${value.replace(/"/g, '""')}"`;
    })
    .join(',');

export const buildChainCsv = ({ chains, componentById }) => {
  const lines = [];
  lines.push(
    toCsvLine([
      'rank',
      'score',
      'depth',
      'root_component',
      'root_file',
      'sink_component',
      'sink_file',
      'root_fanout',
      'distinct_features',
      'prop_path',
      'component_path',
    ])
  );

  chains.forEach((chain, index) => {
    const root = componentById.get(chain.rootComponentId);
    const sink = componentById.get(chain.sinkComponentId);
    const componentPathText = chain.componentPath
      .map((componentId) => {
        const component = componentById.get(componentId);
        if (!component) return componentId;
        return `${component.name}(${component.relativePath})`;
      })
      .join(' -> ');

    lines.push(
      toCsvLine([
        index + 1,
        chain.score,
        chain.depth,
        root?.name ?? chain.rootComponentId,
        root?.relativePath ?? '',
        sink?.name ?? chain.sinkComponentId,
        sink?.relativePath ?? '',
        chain.rootFanout,
        chain.distinctFeatureCount,
        chain.propPath.join(' -> '),
        componentPathText,
      ])
    );
  });

  return `${lines.join('\n')}\n`;
};

export const buildTransitionCsv = ({ transitionBacklog, componentById }) => {
  const lines = [];
  lines.push(
    toCsvLine([
      'rank',
      'score',
      'from_component',
      'from_file',
      'to_component',
      'to_file',
      'root_fanout',
      'distinct_features',
      'source_prop',
      'target_prop',
      'location',
    ])
  );

  transitionBacklog.forEach((entry, index) => {
    const from = componentById.get(entry.rootComponentId);
    const to = componentById.get(entry.sinkComponentId);
    const firstTransition = entry.transitions[0];
    lines.push(
      toCsvLine([
        index + 1,
        entry.score,
        from?.name ?? entry.rootComponentId,
        from?.relativePath ?? '',
        to?.name ?? entry.sinkComponentId,
        to?.relativePath ?? '',
        entry.rootFanout,
        entry.distinctFeatureCount,
        firstTransition?.sourceProp ?? '',
        firstTransition?.targetProp ?? '',
        firstTransition ? `${firstTransition.relativePath}:${firstTransition.line}` : '',
      ])
    );
  });

  return `${lines.join('\n')}\n`;
};

export const buildMarkdown = ({
  summary,
  backlog,
  transitionBacklog,
  componentBacklog,
  forwardingComponentBacklog,
  componentById,
}) => {
  const lines = [];
  lines.push('# Prop Drilling Scan');
  lines.push('');
  lines.push(`Generated at: ${summary.generatedAt}`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(`- Scanned source files: ${summary.scannedSourceFiles}`);
  lines.push(`- JSX files scanned: ${summary.scannedJsxFiles}`);
  lines.push(`- Components detected: ${summary.componentCount}`);
  lines.push(`- Components forwarding parent props (hotspot threshold): ${summary.componentsWithForwarding}`);
  lines.push(`- Components forwarding parent props (any): ${summary.componentsWithAnyForwarding}`);
  lines.push(`- Resolved forwarded transitions: ${summary.resolvedTransitionCount}`);
  lines.push(`- Candidate chains (depth >= 2): ${summary.depth2CandidateChainCount}`);
  lines.push(`- Candidate chains (depth >= 3): ${summary.candidateChainCount}`);
  lines.push(`- High-priority chains (depth >= 4): ${summary.highPriorityChainCount}`);
  lines.push(`- Unknown spread forwarding edges: ${summary.unknownSpreadForwardingCount}`);
  lines.push(`- Hotspot forwarding components backlog size: ${componentBacklog.length}`);
  lines.push('');
  lines.push('## Hot Features');
  lines.push('');
  lines.push('| Feature Scope | Forwarding Components |');
  lines.push('| --- | ---: |');
  if (summary.topFeatureScopes.length === 0) {
    lines.push('| _none_ | 0 |');
  } else {
    for (const entry of summary.topFeatureScopes) {
      lines.push(`| \`${entry.scope}\` | ${entry.count} |`);
    }
  }
  lines.push('');
  lines.push('## Top Prop-Drilling Components');
  lines.push('');
  lines.push(
    '| Rank | Component | File | Forwarded Props | Outgoing Transitions | Unknown Spread Forwarding | Hotspot |'
  );
  lines.push('| ---: | --- | --- | ---: | ---: | --- | --- |');
  const hotspotComponentIds = new Set(componentBacklog.map((entry) => entry.componentId));
  const componentRows = forwardingComponentBacklog.slice(0, TOP_COMPONENT_BACKLOG_LIMIT);
  if (componentRows.length === 0) {
    lines.push('| 1 | _none_ | _none_ | 0 | 0 | no | no |');
  } else {
    componentRows.forEach((entry, index) => {
      lines.push(
        `| ${index + 1} | \`${entry.name}\` | \`${entry.relativePath}\` | ${entry.forwardedPropCount} | ${entry.outgoingTransitionCount} | ${entry.hasUnknownSpreadForwarding ? 'yes' : 'no'} | ${hotspotComponentIds.has(entry.componentId) ? 'yes' : 'no'} |`
      );
    });
  }
  lines.push('');
  lines.push('## Prioritized Transition Backlog (Depth = 2)');
  lines.push('');
  lines.push('| Rank | Score | From | To | Fanout | Features | Prop Mapping | Location |');
  lines.push('| ---: | ---: | --- | --- | ---: | ---: | --- | --- |');
  const transitionRows = transitionBacklog.slice(0, TOP_BACKLOG_LIMIT);
  if (transitionRows.length === 0) {
    lines.push('| 1 | 0 | _none_ | _none_ | 0 | 0 | _none_ | _none_ |');
  } else {
    transitionRows.forEach((chain, index) => {
      const root = componentById.get(chain.rootComponentId);
      const sink = componentById.get(chain.sinkComponentId);
      const firstTransition = chain.transitions[0];
      const location = firstTransition ? `${firstTransition.relativePath}:${firstTransition.line}` : '_unknown_';
      lines.push(
        `| ${index + 1} | ${chain.score} | \`${root?.name ?? chain.rootComponentId}\` | \`${sink?.name ?? chain.sinkComponentId}\` | ${chain.rootFanout} | ${chain.distinctFeatureCount} | \`${chain.propPath.join(' -> ')}\` | \`${location}\` |`
      );
    });
  }
  lines.push('');
  lines.push('## Ranked Chain Backlog (Depth >= 3)');
  lines.push('');
  lines.push('| Rank | Score | Depth | Root | Sink | Root Fanout | Features | Prop Path |');
  lines.push('| ---: | ---: | ---: | --- | --- | ---: | ---: | --- |');
  if (backlog.length === 0) {
    lines.push('| 1 | 0 | 0 | _none_ | _none_ | 0 | 0 | _none_ |');
  } else {
    backlog.slice(0, TOP_BACKLOG_LIMIT).forEach((chain, index) => {
      const root = componentById.get(chain.rootComponentId);
      const sink = componentById.get(chain.sinkComponentId);
      lines.push(
        `| ${index + 1} | ${chain.score} | ${chain.depth} | \`${root?.name ?? chain.rootComponentId}\` | \`${sink?.name ?? chain.sinkComponentId}\` | ${chain.rootFanout} | ${chain.distinctFeatureCount} | \`${chain.propPath.join(' -> ')}\` |`
      );
    });
  }
  lines.push('');
  lines.push('## Top Chain Details (Depth >= 3)');
  lines.push('');
  if (backlog.length === 0) {
    lines.push('- No depth >= 3 chains were detected in this scan. Use the depth = 2 transition backlog for refactor wave planning.');
    lines.push('');
  } else {
    backlog.slice(0, 15).forEach((chain, index) => {
      const root = componentById.get(chain.rootComponentId);
      const sink = componentById.get(chain.sinkComponentId);
      lines.push(`### ${index + 1}. ${root?.name ?? chain.rootComponentId} -> ${sink?.name ?? chain.sinkComponentId}`);
      lines.push('');
      lines.push(`- Score: ${chain.score}`);
      lines.push(`- Depth: ${chain.depth}`);
      lines.push(`- Root fanout: ${chain.rootFanout}`);
      lines.push(`- Prop path: ${chain.propPath.join(' -> ')}`);
      lines.push('- Component path:');
      for (const componentId of chain.componentPath) {
        const component = componentById.get(componentId);
        if (!component) {
          lines.push(`  - \`${componentId}\``);
          continue;
        }
        lines.push(`  - \`${component.name}\` (${component.relativePath})`);
      }
      lines.push('- Transition lines:');
      for (const transition of chain.transitions) {
        const fromComponent = componentById.get(transition.fromComponentId);
        const toComponent = componentById.get(transition.toComponentId);
        lines.push(
          `  - \`${fromComponent?.name ?? transition.fromComponentId}\` -> \`${toComponent?.name ?? transition.toComponentId}\`: \`${transition.sourceProp}\` -> \`${transition.targetProp}\` at ${transition.relativePath}:${transition.line}`
        );
      }
      lines.push('');
    });
  }
  lines.push('## Top Transition Details (Depth = 2)');
  lines.push('');
  transitionRows.slice(0, 15).forEach((chain, index) => {
    const root = componentById.get(chain.rootComponentId);
    const sink = componentById.get(chain.sinkComponentId);
    const firstTransition = chain.transitions[0];
    lines.push(`### ${index + 1}. ${root?.name ?? chain.rootComponentId} -> ${sink?.name ?? chain.sinkComponentId}`);
    lines.push('');
    lines.push(`- Score: ${chain.score}`);
    lines.push(`- Root fanout: ${chain.rootFanout}`);
    lines.push(`- Prop mapping: ${chain.propPath.join(' -> ')}`);
    if (firstTransition) {
      lines.push(`- Location: ${firstTransition.relativePath}:${firstTransition.line}`);
    }
    lines.push('');
  });

  lines.push('## Execution Notes');
  lines.push('');
  lines.push('- Start with the top depth = 2 transition backlog to eliminate pass-through props that block deeper chain detection.');
  lines.push('- Continue prioritizing depth >= 4 chains in `feature:*` scopes once they appear.');
  lines.push('- Prefer introducing feature-level providers first, then split hot read/write contexts.');
  lines.push('- Re-run scan after each refactor wave and track depth/fanout reductions.');

  return `${lines.join('\n')}\n`;
};
