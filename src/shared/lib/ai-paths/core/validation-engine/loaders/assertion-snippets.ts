import 'server-only';

import {
  DOCS_SNIPPETS_SOURCE_PATH,
  NODE_LABEL_TO_TYPE,
} from '../docs-registry-adapter.constants';
import {
  normalizeLabel,
  toModuleFromNodeType,
} from '../docs-registry-adapter.helpers';
import type {
  AiPathsDocAssertion,
} from '../docs-registry-adapter.types';

export const parseSnippetWiringAssertions = (
  snippetName: string,
  snippetText: string,
  sourceHash: string
): AiPathsDocAssertion[] => {
  const sourcePath = `${DOCS_SNIPPETS_SOURCE_PATH}#${snippetName}`;
  const snippetSlug = snippetName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const parsed = snippetText
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.includes('\u2192') || line.includes('->'))
    .map((line: string): AiPathsDocAssertion[] | null => {
      const normalized = line.replace(/\s+/g, ' ').replace(/->/g, '\u2192');
      const [leftRaw, rightRaw] = normalized.split('\u2192').map((chunk) => chunk.trim());
      if (!leftRaw || !rightRaw) return null;
      const [fromLabelRaw, fromPortRaw] = leftRaw.split('.').map((chunk) => chunk.trim());
      const [toLabelRaw, toPortRaw] = rightRaw.split('.').map((chunk) => chunk.trim());
      if (!fromLabelRaw || !toLabelRaw || !fromPortRaw || !toPortRaw) return null;
      const fromType = NODE_LABEL_TO_TYPE[normalizeLabel(fromLabelRaw)];
      const toType = NODE_LABEL_TO_TYPE[normalizeLabel(toLabelRaw)];
      if (!fromType || !toType) return null;
      const id = `snippet_wire_${snippetSlug}_${fromType}_${fromPortRaw}_to_${toType}_${toPortRaw}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
      const forwardAssertion: AiPathsDocAssertion = {
        id,
        title: `${fromLabelRaw}.${fromPortRaw} connects to ${toLabelRaw}.${toPortRaw}`,
        module: toModuleFromNodeType(fromType),
        severity: 'info',
        description: `Wiring guideline from ${snippetName}: ${fromLabelRaw}.${fromPortRaw} -> ${toLabelRaw}.${toPortRaw}.`,
        recommendation: `Connect ${fromLabelRaw}.${fromPortRaw} output into ${toLabelRaw}.${toPortRaw} input where applicable.`,
        appliesToNodeTypes: [fromType],
        conditionMode: 'all',
        sequenceHint: 300,
        confidence: 0.6,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_to',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            toNodeType: toType,
          },
        ],
      };
      const reverseId =
        `snippet_wire_rev_${snippetSlug}_${toType}_${toPortRaw}_from_${fromType}_${fromPortRaw}`
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, '_');
      const reverseAssertion: AiPathsDocAssertion = {
        id: reverseId,
        title: `${toLabelRaw}.${toPortRaw} expects ${fromLabelRaw}.${fromPortRaw}`,
        module: toModuleFromNodeType(toType),
        severity: 'info',
        description: `Reverse wiring guideline from ${snippetName}: ${toLabelRaw}.${toPortRaw} should be fed from ${fromLabelRaw}.${fromPortRaw}.`,
        recommendation: `Wire ${toLabelRaw}.${toPortRaw} from ${fromLabelRaw}.${fromPortRaw} where this branch is used.`,
        appliesToNodeTypes: [toType],
        conditionMode: 'all',
        sequenceHint: 302,
        confidence: 0.58,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_from',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            fromNodeType: fromType,
          },
        ],
      };
      return [forwardAssertion, reverseAssertion];
    })
    .flatMap((entry: AiPathsDocAssertion[] | null): AiPathsDocAssertion[] =>
      Array.isArray(entry) ? entry : []
    );
  const seen = new Set<string>();
  return parsed.filter((assertion: AiPathsDocAssertion): boolean => {
    if (seen.has(assertion.id)) return false;
    seen.add(assertion.id);
    return true;
  });
};
