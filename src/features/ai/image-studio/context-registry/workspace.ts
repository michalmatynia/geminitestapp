import { PAGE_CONTEXT_ENGINE_VERSION } from '@/features/ai/ai-context-registry/context/page-context-shared';
import type { ImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type {
  ImageStudioProjectRecord,
  ImageStudioSlotRecord,
} from '@/shared/contracts/image-studio';

export const IMAGE_STUDIO_CONTEXT_ROOT_IDS = [
  'page:admin-image-studio',
  'component:image-studio-slot-tree',
  'component:image-studio-center-preview',
  'component:image-studio-right-sidebar',
  'component:image-studio-generation-toolbar',
  'action:image-studio-run',
  'action:image-studio-sequence-run',
  'action:image-studio-ai-path-object-analysis',
  'action:image-studio-prompt-extract',
  'action:image-studio-ui-extractor',
  'action:image-studio-mask-ai',
  'collection:image-studio-projects',
  'collection:image-studio-slots',
  'collection:image-studio-runs',
  'collection:image-studio-sequence-runs',
] as const;

export const IMAGE_STUDIO_CONTEXT_RUNTIME_REF = {
  id: 'runtime:image-studio:workspace',
  kind: 'runtime_document' as const,
  providerId: 'image-studio-page-local',
  entityType: 'image_studio_workspace_state',
};

type MaskShapeLike = {
  type: string;
  visible?: boolean;
  closed?: boolean;
  points: Array<{ x: number; y: number }>;
};

type LandingSlotLike = {
  index: number;
  status: 'pending' | 'completed' | 'failed';
  output: { id: string; filename?: string | null } | null;
};

export type BuildImageStudioWorkspaceContextBundleInput = {
  activeTab: string;
  projectId: string;
  projects: ImageStudioProjectRecord[];
  slots: ImageStudioSlotRecord[];
  selectedSlot: ImageStudioSlotRecord | null;
  workingSlot: ImageStudioSlotRecord | null;
  selectedFolder: string;
  previewMode: string;
  promptText: string;
  paramsState: Record<string, unknown> | null;
  studioSettings: ImageStudioSettings;
  isFocusMode: boolean;
  previewCanvasSize: string;
  maskShapes: MaskShapeLike[];
  maskInvert: boolean;
  maskFeather: number;
  activeRunId: string | null;
  activeRunStatus: string | null;
  activeRunError: string | null;
  landingSlots: LandingSlotLike[];
  generationHistoryCount: number;
  assignedModelId: string | null;
};

const trimText = (value: string, maxLength: number): string => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

type ProjectLike = {
  id: string;
  name?: string | null;
  canvasWidthPx?: number | null;
  canvasHeightPx?: number | null;
};

type WorkspacePromptSummary = {
  paramKeys: string[];
  promptPreview: string;
  outputCount: number;
  quality: string | null;
  size: string | null;
  background: string | null;
};

type WorkspaceDocumentBuildContext = {
  activeProject: ImageStudioProjectRecord | null;
  eligibleMaskShapeCount: number;
  input: BuildImageStudioWorkspaceContextBundleInput;
  landingSummary: Record<string, number>;
  promptSummary: WorkspacePromptSummary;
};

const countEligibleMaskShapes = (shapes: readonly MaskShapeLike[]): number =>
  shapes.filter(
    (shape) =>
      shape.visible !== false &&
      shape.closed !== false &&
      (shape.type === 'polygon' || shape.type === 'lasso') &&
      shape.points.length >= 3
  ).length;

const summarizeProject = (project: ProjectLike, activeProjectId: string) => ({
  id: project.id,
  name: project.name ?? '',
  canvasWidthPx: project.canvasWidthPx ?? null,
  canvasHeightPx: project.canvasHeightPx ?? null,
  isActive: project.id === activeProjectId,
});

const summarizeSlot = (
  slot: ImageStudioSlotRecord,
  input: Pick<
    BuildImageStudioWorkspaceContextBundleInput,
    'selectedSlot' | 'workingSlot' | 'selectedFolder'
  >
) => ({
  id: slot.id,
  name: slot.name ?? null,
  folderPath: slot.folderPath ?? null,
  imageUrl: slot.imageUrl ?? null,
  hasImageFile: Boolean(slot.imageFileId ?? slot.imageFile?.id),
  width: slot.width ?? slot.imageFile?.width ?? null,
  height: slot.height ?? slot.imageFile?.height ?? null,
  role: slot.metadata?.role ?? null,
  isSelected: slot.id === input.selectedSlot?.id,
  isWorking: slot.id === input.workingSlot?.id,
  inSelectedFolder:
    !input.selectedFolder || (slot.folderPath ?? '').trim() === input.selectedFolder.trim(),
});

const buildWorkspacePromptSummary = (
  input: BuildImageStudioWorkspaceContextBundleInput
): WorkspacePromptSummary => ({
  paramKeys: Object.keys(input.paramsState ?? {}).sort(),
  promptPreview: trimText(input.promptText, 500),
  outputCount: Number(input.studioSettings.targetAi.openai.image.n ?? 1) || 1,
  quality: input.studioSettings.targetAi.openai.image.quality ?? null,
  size: input.studioSettings.targetAi.openai.image.size ?? null,
  background: input.studioSettings.targetAi.openai.image.background ?? null,
});

const buildWorkspaceSnapshotSection = (
  context: WorkspaceDocumentBuildContext
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Workspace snapshot',
  items: [
    {
      activeTab: context.input.activeTab,
      projectId: context.input.projectId || null,
      projectName: context.activeProject?.id ?? null,
      projectCount: context.input.projects.length,
      slotCount: context.input.slots.length,
      selectedFolder: context.input.selectedFolder || null,
      previewMode: context.input.previewMode,
      previewCanvasSize: context.input.previewCanvasSize,
      isFocusMode: context.input.isFocusMode,
      selectedSlotId: context.input.selectedSlot?.id ?? null,
      workingSlotId: context.input.workingSlot?.id ?? null,
      assignedModelId: context.input.assignedModelId,
    },
  ],
});

const buildPromptAndGenerationSection = (
  context: WorkspaceDocumentBuildContext
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Prompt and generation state',
  items: [
    {
      promptPreview: context.promptSummary.promptPreview,
      paramKeys: context.promptSummary.paramKeys,
      activeRunId: context.input.activeRunId,
      activeRunStatus: context.input.activeRunStatus,
      activeRunError: context.input.activeRunError,
      generationHistoryCount: context.input.generationHistoryCount,
      landingSummary: context.landingSummary,
      outputCount: context.promptSummary.outputCount,
      quality: context.promptSummary.quality,
      size: context.promptSummary.size,
      background: context.promptSummary.background,
    },
  ],
});

const buildMaskAndSelectionSection = (
  context: WorkspaceDocumentBuildContext
): ContextRuntimeDocumentSection => ({
  kind: 'facts',
  title: 'Mask and selection state',
  items: [
    {
      selectedSlotName: context.input.selectedSlot?.name ?? null,
      selectedSlotId: context.input.selectedSlot?.id ?? null,
      workingSlotName: context.input.workingSlot?.name ?? null,
      workingSlotId: context.input.workingSlot?.id ?? null,
      selectedFolder: context.input.selectedFolder || null,
      maskShapeCount: context.input.maskShapes.length,
      eligibleMaskShapeCount: context.eligibleMaskShapeCount,
      maskInvert: context.input.maskInvert,
      maskFeather: context.input.maskFeather,
    },
  ],
});

const buildWorkspaceItemSections = (
  context: WorkspaceDocumentBuildContext
): ContextRuntimeDocumentSection[] => {
  const sections: ContextRuntimeDocumentSection[] = [];
  if (context.input.projects.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Projects',
      summary: 'Image Studio projects visible to the operator.',
      items: context.input.projects
        .slice(0, 8)
        .map((project) => summarizeProject(project, context.input.projectId)),
    });
  }
  if (context.input.slots.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Visible slots',
      summary: 'Representative slot state from the current workspace.',
      items: context.input.slots.slice(0, 16).map((slot) => summarizeSlot(slot, context.input)),
    });
  }
  if (context.input.landingSlots.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Landing slots',
      summary: 'Current output landing slots for the active generation run.',
      items: context.input.landingSlots.slice(0, 8).map((slot) => ({
        index: slot.index,
        status: slot.status,
        outputId: slot.output?.id ?? null,
        outputFilename: slot.output?.filename ?? null,
      })),
    });
  }
  return sections;
};

const buildWorkspaceFacts = (context: WorkspaceDocumentBuildContext) => ({
  activeTab: context.input.activeTab,
  projectId: context.input.projectId || null,
  projectName: context.activeProject?.id ?? null,
  slotCount: context.input.slots.length,
  selectedFolder: context.input.selectedFolder || null,
  selectedSlotId: context.input.selectedSlot?.id ?? null,
  workingSlotId: context.input.workingSlot?.id ?? null,
  promptPreview: trimText(context.input.promptText, 280),
  paramKeys: context.promptSummary.paramKeys,
  previewMode: context.input.previewMode,
  previewCanvasSize: context.input.previewCanvasSize,
  isFocusMode: context.input.isFocusMode,
  assignedModelId: context.input.assignedModelId,
  maskShapeCount: context.input.maskShapes.length,
  eligibleMaskShapeCount: context.eligibleMaskShapeCount,
  maskInvert: context.input.maskInvert,
  maskFeather: context.input.maskFeather,
  activeRunId: context.input.activeRunId,
  activeRunStatus: context.input.activeRunStatus,
  generationHistoryCount: context.input.generationHistoryCount,
  requestedOutputCount: context.promptSummary.outputCount,
  requestedSize: context.promptSummary.size,
  requestedQuality: context.promptSummary.quality,
  requestedBackground: context.promptSummary.background,
});

export const buildImageStudioWorkspaceRuntimeDocument = (
  input: BuildImageStudioWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const activeProject =
    input.projects.find((project) => project.id === input.projectId) ?? null;
  const eligibleMaskShapeCount = countEligibleMaskShapes(input.maskShapes);
  const landingSummary = input.landingSlots.reduce<Record<string, number>>((summary, slot) => {
    summary[slot.status] = (summary[slot.status] ?? 0) + 1;
    return summary;
  }, {});
  const promptSummary = buildWorkspacePromptSummary(input);
  const buildContext: WorkspaceDocumentBuildContext = {
    activeProject,
    eligibleMaskShapeCount,
    input,
    landingSummary,
    promptSummary,
  };
  const sections: ContextRuntimeDocumentSection[] = [
    buildWorkspaceSnapshotSection(buildContext),
    buildPromptAndGenerationSection(buildContext),
    buildMaskAndSelectionSection(buildContext),
    ...buildWorkspaceItemSections(buildContext),
  ];

  return {
    id: IMAGE_STUDIO_CONTEXT_RUNTIME_REF.id,
    kind: 'runtime_document',
    entityType: IMAGE_STUDIO_CONTEXT_RUNTIME_REF.entityType,
    title: activeProject?.id
      ? `Image Studio workspace for ${activeProject.id}`
      : 'Image Studio workspace state',
    summary:
      'Live Image Studio workspace state including the active project, slot selection, prompt, ' +
      'generation settings, mask state, and in-flight run status.',
    status: input.activeRunStatus,
    tags: ['image-studio', 'admin', 'generation', 'editor', 'live-state'],
    relatedNodeIds: [...IMAGE_STUDIO_CONTEXT_ROOT_IDS],
    facts: buildWorkspaceFacts(buildContext),
    sections,
    provenance: {
      source: 'image-studio.admin.client-state',
      persisted: false,
    },
  };
};

export const buildImageStudioWorkspaceContextBundle = (
  input: BuildImageStudioWorkspaceContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [IMAGE_STUDIO_CONTEXT_RUNTIME_REF],
  nodes: [],
  documents: [buildImageStudioWorkspaceRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
