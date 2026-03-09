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

const summarizeFacts = (document: ContextRuntimeDocument): string[] => {
  const facts = document.facts ?? {};
  const workspaceBits = [
    typeof facts['projectName'] === 'string' ? `project=${facts['projectName']}` : null,
    typeof facts['activeTab'] === 'string' ? `tab=${facts['activeTab']}` : null,
    typeof facts['selectedSlotId'] === 'string' ? `selectedSlot=${facts['selectedSlotId']}` : null,
    typeof facts['workingSlotId'] === 'string' ? `workingSlot=${facts['workingSlotId']}` : null,
    typeof facts['previewMode'] === 'string' ? `preview=${facts['previewMode']}` : null,
    typeof facts['assignedModelId'] === 'string' ? `model=${facts['assignedModelId']}` : null,
  ].filter((segment): segment is string => Boolean(segment));

  const lines: string[] = [];
  if (workspaceBits.length > 0) {
    lines.push(`Workspace: ${workspaceBits.join('; ')}.`);
  }
  if (typeof facts['promptPreview'] === 'string' && facts['promptPreview'].trim()) {
    lines.push(`Prompt draft: ${trimText(facts['promptPreview'], 220)}.`);
  }
  if (Array.isArray(facts['paramKeys']) && facts['paramKeys'].length > 0) {
    const paramKeys = facts['paramKeys']
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .slice(0, 10);
    if (paramKeys.length > 0) {
      lines.push(`Active params: ${paramKeys.join(', ')}.`);
    }
  }
  if (typeof facts['maskShapeCount'] === 'number' && facts['maskShapeCount'] > 0) {
    lines.push(
      `Mask state: shapes=${facts['maskShapeCount']}, invert=${Boolean(
        facts['maskInvert']
      )}, feather=${Number(facts['maskFeather'] ?? 0)}.`
    );
  }
  if (typeof facts['activeRunStatus'] === 'string' && facts['activeRunStatus'].trim()) {
    lines.push(`Active run status: ${facts['activeRunStatus']}.`);
  }

  return lines;
};

const summarizeNodes = (nodes: readonly ContextNode[]): string | null => {
  const names = nodes
    .map((node) => node.name.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 8);
  if (names.length === 0) {
    return null;
  }

  return `Relevant UI surfaces: ${names.join(', ')}.`;
};

export const buildImageStudioWorkspaceSystemPrompt = ({
  registryBundle,
  taskLabel,
  extraInstructions,
}: {
  registryBundle: ContextRegistryResolutionBundle | null | undefined;
  taskLabel: string;
  extraInstructions?: string | null;
}): string => {
  if (!registryBundle || (!registryBundle.documents.length && !registryBundle.nodes.length)) {
    return '';
  }

  const lines = [
    'Context Registry bundle for the current Image Studio workspace.',
    `Use it as live operator context for ${taskLabel}.`,
    'Prefer this workspace state over generic assumptions when it changes the answer.',
  ];

  if (extraInstructions?.trim()) {
    lines.push(extraInstructions.trim());
  }

  const primaryDocument = registryBundle.documents[0];
  if (primaryDocument) {
    lines.push(...summarizeFacts(primaryDocument));
  }

  const nodeSummary = summarizeNodes(registryBundle.nodes);
  if (nodeSummary) {
    lines.push(nodeSummary);
  }

  return trimText(lines.join('\n'), 1200);
};
