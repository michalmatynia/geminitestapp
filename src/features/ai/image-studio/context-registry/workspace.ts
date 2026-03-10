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

export const buildImageStudioWorkspaceRuntimeDocument = (
  input: BuildImageStudioWorkspaceContextBundleInput
): ContextRuntimeDocument => {
  const activeProject =
    input.projects.find((project) => project.id === input.projectId) ?? null;
  const eligibleMaskShapeCount = countEligibleMaskShapes(input.maskShapes);
  const paramKeys = Object.keys(input.paramsState ?? {}).sort();
  const landingSummary = input.landingSlots.reduce<Record<string, number>>((summary, slot) => {
    summary[slot.status] = (summary[slot.status] ?? 0) + 1;
    return summary;
  }, {});

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Workspace snapshot',
      items: [
        {
          activeTab: input.activeTab,
          projectId: input.projectId || null,
          projectName: activeProject?.id ?? null,
          projectCount: input.projects.length,
          slotCount: input.slots.length,
          selectedFolder: input.selectedFolder || null,
          previewMode: input.previewMode,
          previewCanvasSize: input.previewCanvasSize,
          isFocusMode: input.isFocusMode,
          selectedSlotId: input.selectedSlot?.id ?? null,
          workingSlotId: input.workingSlot?.id ?? null,
          assignedModelId: input.assignedModelId,
        },
      ],
    },
    {
      kind: 'facts',
      title: 'Prompt and generation state',
      items: [
        {
          promptPreview: trimText(input.promptText, 500),
          paramKeys,
          activeRunId: input.activeRunId,
          activeRunStatus: input.activeRunStatus,
          activeRunError: input.activeRunError,
          generationHistoryCount: input.generationHistoryCount,
          landingSummary,
          outputCount: Number(input.studioSettings.targetAi.openai.image.n ?? 1) || 1,
          quality: input.studioSettings.targetAi.openai.image.quality ?? null,
          size: input.studioSettings.targetAi.openai.image.size ?? null,
          background: input.studioSettings.targetAi.openai.image.background ?? null,
        },
      ],
    },
    {
      kind: 'facts',
      title: 'Mask and selection state',
      items: [
        {
          selectedSlotName: input.selectedSlot?.name ?? null,
          selectedSlotId: input.selectedSlot?.id ?? null,
          workingSlotName: input.workingSlot?.name ?? null,
          workingSlotId: input.workingSlot?.id ?? null,
          selectedFolder: input.selectedFolder || null,
          maskShapeCount: input.maskShapes.length,
          eligibleMaskShapeCount,
          maskInvert: input.maskInvert,
          maskFeather: input.maskFeather,
        },
      ],
    },
  ];

  if (input.projects.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Projects',
      summary: 'Image Studio projects visible to the operator.',
      items: input.projects.slice(0, 8).map((project) => summarizeProject(project, input.projectId)),
    });
  }

  if (input.slots.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Visible slots',
      summary: 'Representative slot state from the current workspace.',
      items: input.slots.slice(0, 16).map((slot) => summarizeSlot(slot, input)),
    });
  }

  if (input.landingSlots.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Landing slots',
      summary: 'Current output landing slots for the active generation run.',
      items: input.landingSlots.slice(0, 8).map((slot) => ({
        index: slot.index,
        status: slot.status,
        outputId: slot.output?.id ?? null,
        outputFilename: slot.output?.filename ?? null,
      })),
    });
  }

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
    facts: {
      activeTab: input.activeTab,
      projectId: input.projectId || null,
      projectName: activeProject?.id ?? null,
      slotCount: input.slots.length,
      selectedFolder: input.selectedFolder || null,
      selectedSlotId: input.selectedSlot?.id ?? null,
      workingSlotId: input.workingSlot?.id ?? null,
      promptPreview: trimText(input.promptText, 280),
      paramKeys,
      previewMode: input.previewMode,
      previewCanvasSize: input.previewCanvasSize,
      isFocusMode: input.isFocusMode,
      assignedModelId: input.assignedModelId,
      maskShapeCount: input.maskShapes.length,
      eligibleMaskShapeCount,
      maskInvert: input.maskInvert,
      maskFeather: input.maskFeather,
      activeRunId: input.activeRunId,
      activeRunStatus: input.activeRunStatus,
      generationHistoryCount: input.generationHistoryCount,
      requestedOutputCount: Number(input.studioSettings.targetAi.openai.image.n ?? 1) || 1,
      requestedSize: input.studioSettings.targetAi.openai.image.size ?? null,
      requestedQuality: input.studioSettings.targetAi.openai.image.quality ?? null,
      requestedBackground: input.studioSettings.targetAi.openai.image.background ?? null,
    },
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
