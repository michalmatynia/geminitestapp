import type {
  ContextNode,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';

const trimText = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const stringifyFactsLine = (document: ContextRuntimeDocument): string => {
  const facts = document.facts ?? {};
  const segments = [
    typeof facts['projectName'] === 'string' ? `project=${facts['projectName']}` : null,
    typeof facts['activeTab'] === 'string' ? `tab=${facts['activeTab']}` : null,
    typeof facts['selectedSlotId'] === 'string' ? `selectedSlot=${facts['selectedSlotId']}` : null,
    typeof facts['workingSlotId'] === 'string' ? `workingSlot=${facts['workingSlotId']}` : null,
    typeof facts['previewMode'] === 'string' ? `preview=${facts['previewMode']}` : null,
    typeof facts['requestedSize'] === 'string' ? `size=${facts['requestedSize']}` : null,
    typeof facts['requestedQuality'] === 'string'
      ? `quality=${facts['requestedQuality']}`
      : null,
    typeof facts['requestedBackground'] === 'string'
      ? `background=${facts['requestedBackground']}`
      : null,
    typeof facts['assignedModelId'] === 'string' ? `model=${facts['assignedModelId']}` : null,
  ].filter((segment): segment is string => Boolean(segment));

  return segments.length > 0 ? segments.join('; ') : '';
};

const summarizeDocument = (document: ContextRuntimeDocument): string[] => {
  const lines: string[] = [];
  const factsLine = stringifyFactsLine(document);
  if (factsLine) {
    lines.push(`Workspace: ${factsLine}.`);
  }

  const facts = document.facts ?? {};
  if (typeof facts['promptPreview'] === 'string' && facts['promptPreview'].trim()) {
    lines.push(`Current prompt draft: ${trimText(facts['promptPreview'], 180)}.`);
  }
  if (Array.isArray(facts['paramKeys']) && facts['paramKeys'].length > 0) {
    lines.push(
      `Active prompt params: ${facts['paramKeys']
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .slice(0, 8)
        .join(', ')}.`
    );
  }
  if (typeof facts['maskShapeCount'] === 'number' && facts['maskShapeCount'] > 0) {
    lines.push(
      `Mask state: ${facts['maskShapeCount']} shape(s), invert=${Boolean(
        facts['maskInvert']
      )}, feather=${Number(facts['maskFeather'] ?? 0)}.`
    );
  }
  if (typeof facts['activeRunStatus'] === 'string' && facts['activeRunStatus'].trim()) {
    lines.push(`Active run status: ${facts['activeRunStatus']}.`);
  }

  return lines;
};

const summarizeNode = (node: ContextNode): string | null => {
  const normalizedName = node.name.trim();
  if (!normalizedName) {
    return null;
  }

  return normalizedName;
};

export const buildImageStudioGenerationPrompt = (
  basePrompt: string,
  registryBundle: ContextRegistryResolutionBundle | null | undefined
): string => {
  const normalizedPrompt = basePrompt.trim();
  if (!registryBundle || (!registryBundle.nodes.length && !registryBundle.documents.length)) {
    return normalizedPrompt;
  }

  const lines: string[] = [];
  const primaryDocument = registryBundle.documents[0];
  if (primaryDocument) {
    lines.push(...summarizeDocument(primaryDocument));
  }

  const nodeNames = registryBundle.nodes
    .map(summarizeNode)
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);
  if (nodeNames.length > 0) {
    lines.push(`Relevant UI surfaces: ${nodeNames.join(', ')}.`);
  }

  const contextBlock = trimText(lines.join('\n'), 900);
  if (!contextBlock) {
    return normalizedPrompt;
  }

  return [
    'Image Studio workspace context:',
    contextBlock,
    `Primary creative brief: ${normalizedPrompt}`,
  ].join('\n\n');
};
