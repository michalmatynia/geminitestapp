'use client';

import { Download, ExternalLink, Eye, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import {
  FormActions,
  FormField,
  FormSection,
} from '@/shared/ui/forms-and-actions.public';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Input, Textarea, useToast } from '@/shared/ui/primitives.public';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { CvBlockPicker } from '../components/cv-builder/CvBlockPicker';
import { CvBlockSettingsPanel } from '../components/cv-builder/CvBlockSettingsPanel';
import { CvLayerPanel } from '../components/cv-builder/CvLayerPanel';
import { compileCvBlocksToHtml } from '../components/cv-builder/compile-cv-blocks';
import type { CvBlock } from '../components/cv-builder/cv-block-model';
import { isCvLeafBlock, normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import { openFilemakerCvPdfPreview } from '../cv-pdf-preview';
import type {
  FilemakerCv,
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvStatus,
  FilemakerCvTailoringPatch,
} from '../filemaker-cv.types';
import { decodeRouteParam, formatTimestamp } from './filemaker-page-utils';

/* eslint-disable
   complexity,
   max-lines,
   max-lines-per-function
 */

type CvDetailState = {
  cv: FilemakerCv | null;
  error: string | null;
  isLoading: boolean;
};

type CvPatchResponse = {
  cv: FilemakerCv;
  meta?: {
    canonicalEditMode?: string;
    ignoredFields?: string[];
  };
};

const STATUS_OPTIONS: Array<{ label: string; value: FilemakerCvStatus }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const readDownloadFilename = (response: Response, fallback: string): string => {
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1] !== undefined && quoted[1].length > 0) return quoted[1];
  const unquoted = /filename=([^;]+)/i.exec(contentDisposition);
  const unquotedFilename = unquoted?.[1]?.trim() ?? '';
  return unquotedFilename.length > 0 ? unquotedFilename : fallback;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const firstBlockId = (blocks: CvBlock[]): string | null => blocks[0]?.id ?? null;

const joinLines = (values: string[] | null | undefined): string => (values ?? []).join('\n');

const parseLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0);

const areStringListsEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value: string, index: number): boolean => value === right[index]);

const buildExperiencePatchSignature = (
  patch: FilemakerCvExperienceHighlightPatch,
  index: number
): string =>
  [
    getExperiencePatchKey(patch, index),
    patch.experienceId ?? '',
    patch.experienceTitle ?? '',
    patch.company ?? '',
    patch.role ?? '',
    ...patch.highlights,
  ].join('\u001f');

const areExperiencePatchesEqual = (
  left: FilemakerCvExperienceHighlightPatch[],
  right: FilemakerCvExperienceHighlightPatch[]
): boolean =>
  left.length === right.length &&
  left.every(
    (patch: FilemakerCvExperienceHighlightPatch, index: number): boolean =>
      buildExperiencePatchSignature(patch, index) ===
      buildExperiencePatchSignature(right[index] as FilemakerCvExperienceHighlightPatch, index)
  );

const normalizePatchKey = (value: string | null | undefined): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, ' ')
    .trim();

const patchKeyMatches = (left: string | null | undefined, right: string | null | undefined): boolean => {
  const normalizedLeft = normalizePatchKey(left);
  const normalizedRight = normalizePatchKey(right);
  if (normalizedLeft.length === 0 || normalizedRight.length === 0) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

const getExperiencePatchKey = (
  patch: FilemakerCvExperienceHighlightPatch,
  index: number
): string =>
  `${patch.experienceKey}-${index}`;

const buildExperienceHighlightsTextMap = (
  patches: FilemakerCvExperienceHighlightPatch[] | null | undefined
): Record<string, string> =>
  (patches ?? []).reduce<Record<string, string>>(
    (values: Record<string, string>, patch: FilemakerCvExperienceHighlightPatch, index: number) => ({
      ...values,
      [getExperiencePatchKey(patch, index)]: joinLines(patch.highlights),
    }),
    {}
  );

const formatExperiencePatchLabel = (patch: FilemakerCvExperienceHighlightPatch): string => {
  const roleCompany = [patch.role, patch.company]
    .filter((value: string | null | undefined): value is string =>
      typeof value === 'string' && value.trim().length > 0
    )
    .join(' | ');
  if (typeof patch.experienceTitle === 'string' && patch.experienceTitle.length > 0) {
    return patch.experienceTitle;
  }
  if (roleCompany.length > 0) return roleCompany;
  if (patch.experienceKey.length > 0) return patch.experienceKey;
  return patch.experienceId ?? 'Experience';
};

const isCoreStrengthsBlock = (block: CvBlock): block is Extract<CvBlock, { kind: 'skills' }> =>
  block.kind === 'skills' &&
  (patchKeyMatches(block.label, 'Core Strengths') ||
    patchKeyMatches(block.label, 'Strengths') ||
    patchKeyMatches(block.id, 'skills'));

const isSelectedTechnicalEnvironmentBlock = (
  block: CvBlock
): block is Extract<CvBlock, { kind: 'techStack' }> =>
  block.kind === 'techStack' &&
  (patchKeyMatches(block.label, 'Selected Technical Environment') ||
    patchKeyMatches(block.label, 'Technical Environment') ||
    patchKeyMatches(block.label, 'Tech stack') ||
    patchKeyMatches(block.id, 'tech'));

const experiencePatchMatchesBlock = (
  patch: FilemakerCvExperienceHighlightPatch,
  block: CvBlock
): boolean => {
  if (block.kind !== 'experience') return false;
  const roleCompany = [block.title, block.organization]
    .filter((value: string): boolean => value.trim().length > 0)
    .join(' | ');
  return (
    patchKeyMatches(patch.experienceId, block.id) ||
    patchKeyMatches(patch.experienceKey, block.id) ||
    patchKeyMatches(patch.experienceTitle, block.title) ||
    patchKeyMatches(patch.experienceTitle, roleCompany) ||
    patchKeyMatches(patch.role, block.title) ||
    patchKeyMatches(patch.company, block.organization) ||
    patchKeyMatches(patch.experienceKey, roleCompany)
  );
};

type CvExperiencePreviewBlock = Extract<CvBlock, { kind: 'experience' }>;

const collectExperienceBlocks = (blocks: CvBlock[]): CvExperiencePreviewBlock[] =>
  blocks.flatMap((block: CvBlock): CvExperiencePreviewBlock[] => {
    if (block.kind === 'experience') return [block];
    if ('children' in block && Array.isArray(block.children)) {
      return collectExperienceBlocks(block.children as CvBlock[]);
    }
    return [];
  });

const createExperiencePatchFromBlock = (
  block: CvExperiencePreviewBlock
): FilemakerCvExperienceHighlightPatch => ({
  experienceKey: block.id,
  experienceId: block.id,
  experienceTitle: [block.title, block.organization]
    .filter((value: string): boolean => value.trim().length > 0)
    .join(' | '),
  company: block.organization.length > 0 ? block.organization : null,
  role: block.title.length > 0 ? block.title : null,
  highlights: block.highlights,
});

const mergeExperiencePatchesWithBlocks = (
  blocks: CvBlock[],
  patches: FilemakerCvExperienceHighlightPatch[]
): FilemakerCvExperienceHighlightPatch[] => {
  const experienceBlocks = collectExperienceBlocks(blocks);
  const merged = experienceBlocks.map((block: CvExperiencePreviewBlock): FilemakerCvExperienceHighlightPatch => {
    const patch = patches.find((entry: FilemakerCvExperienceHighlightPatch): boolean =>
      experiencePatchMatchesBlock(entry, block)
    );
    return patch ?? createExperiencePatchFromBlock(block);
  });
  const unmatchedPatches = patches.filter(
    (patch: FilemakerCvExperienceHighlightPatch): boolean =>
      !experienceBlocks.some((block: CvExperiencePreviewBlock): boolean =>
        experiencePatchMatchesBlock(patch, block)
      )
  );
  return [...merged, ...unmatchedPatches];
};

const applyTailoringPatchToPreviewBlocks = (
  blocks: CvBlock[],
  tailoringPatch: FilemakerCvTailoringPatch | null
): CvBlock[] => {
  if (tailoringPatch === null) return blocks;
  return blocks.map((block: CvBlock): CvBlock => {
    if (block.kind === 'summary' && tailoringPatch.professionalSummary !== null) {
      return { ...block, text: tailoringPatch.professionalSummary };
    }
    if (isCoreStrengthsBlock(block) && tailoringPatch.coreStrengths.length > 0) {
      return { ...block, items: tailoringPatch.coreStrengths };
    }
    if (isSelectedTechnicalEnvironmentBlock(block) && tailoringPatch.selectedTechnicalEnvironment.length > 0) {
      return {
        ...block,
        items: tailoringPatch.selectedTechnicalEnvironment.map((label: string) => {
          const existing = block.items.find((item) =>
            [item.label, item.normalizedLabel, ...(item.aliases ?? [])].some((candidate) =>
              patchKeyMatches(candidate, label)
            )
          );
          return existing ?? { label, iconUrl: '' };
        }),
      };
    }
    if (block.kind === 'experience') {
      const patch = tailoringPatch.experienceHighlightPatches.find(
        (entry: FilemakerCvExperienceHighlightPatch): boolean =>
          experiencePatchMatchesBlock(entry, block)
      );
      if (patch !== undefined) return { ...block, highlights: patch.highlights };
    }
    if ('children' in block && Array.isArray(block.children)) {
      const children = applyTailoringPatchToPreviewBlocks(block.children as CvBlock[], tailoringPatch);
      if (block.kind === 'section') return { ...block, children };
      if (block.kind === 'columns') {
        return { ...block, children: children.filter(isCvRowBlock) };
      }
      return { ...block, children: children.filter(isCvLeafBlock) };
    }
    return block;
  });
};

const isCvRowBlock = (block: CvBlock): block is Extract<CvBlock, { kind: 'row' }> =>
  block.kind === 'row';

const loadCv = async (cvId: string, signal: AbortSignal): Promise<FilemakerCv> => {
  const response = await fetch(`/api/filemaker/cvs/${encodeURIComponent(cvId)}`, { signal });
  if (!response.ok) throw new Error(`Failed to load CV (${response.status}).`);
  const payload = (await response.json()) as { cv: FilemakerCv };
  return payload.cv;
};

export function AdminFilemakerCvEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const routePersonId = useMemo(() => decodeRouteParam(params['personId']), [params]);
  const cvId = useMemo(() => decodeRouteParam(params['cvId']), [params]);
  const cvQueryKey = ['filemaker', 'cvs', 'detail', cvId] as const;
  const cvQuery = createSingleQueryV2<FilemakerCv, FilemakerCv, typeof cvQueryKey>({
    queryKey: cvQueryKey,
    queryFn: async ({ signal }) => loadCv(cvId, signal),
    enabled: cvId.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    meta: {
      source: 'features.filemaker.pages.AdminFilemakerCvEditPage.cvDetail',
      operation: 'detail',
      resource: 'filemaker.cv',
      domain: 'files',
      description: 'Load Filemaker CV detail for the CV editor.',
      errorPresentation: 'inline',
    },
    telemetryContext: {
      hasCvId: cvId.length > 0,
    },
  });
  const [state, setState] = useState<CvDetailState>({
    cv: null,
    error: null,
    isLoading: true,
  });
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<FilemakerCvStatus>('draft');
  const [blocks, setBlocks] = useState<CvBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [patchProfessionalSummary, setPatchProfessionalSummary] = useState('');
  const [patchCoreStrengthsText, setPatchCoreStrengthsText] = useState('');
  const [patchTechnicalEnvironmentText, setPatchTechnicalEnvironmentText] = useState('');
  const [patchExperienceHighlightsText, setPatchExperienceHighlightsText] = useState<Record<string, string>>({});
  const [removedExperiencePatchKeys, setRemovedExperiencePatchKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (cvQuery.data !== undefined) {
      const normalizedBlocks = normalizeCvBlocks(cvQuery.data.bodyBlocks);
      setState({ cv: cvQuery.data, error: null, isLoading: false });
      setTitle(cvQuery.data.title);
      setStatus(cvQuery.data.status);
      setBlocks(normalizedBlocks);
      setSelectedBlockId(firstBlockId(normalizedBlocks));
      setPatchProfessionalSummary(cvQuery.data.tailoringPatch?.professionalSummary ?? '');
      setPatchCoreStrengthsText(
        joinLines(cvQuery.data.tailoringPatch?.coreStrengths ?? cvQuery.data.coreStrengths)
      );
      setPatchTechnicalEnvironmentText(
        joinLines(
          cvQuery.data.tailoringPatch?.selectedTechnicalEnvironment ??
            cvQuery.data.selectedTechnicalEnvironment
        )
      );
      setPatchExperienceHighlightsText(
        buildExperienceHighlightsTextMap(
          cvQuery.data.tailoringPatch?.experienceHighlightPatches ??
            cvQuery.data.experienceHighlightPatches
        )
      );
      setRemovedExperiencePatchKeys([]);
      return;
    }
    if (cvQuery.error !== null) {
      logClientError(cvQuery.error);
      setState({ cv: null, error: cvQuery.error.message, isLoading: false });
      setTitle('');
      setStatus('draft');
      setBlocks([]);
      setSelectedBlockId(null);
      setPatchProfessionalSummary('');
      setPatchCoreStrengthsText('');
      setPatchTechnicalEnvironmentText('');
      setPatchExperienceHighlightsText({});
      setRemovedExperiencePatchKeys([]);
      return;
    }
    setState({ cv: null, error: null, isLoading: cvQuery.isFetching });
  }, [cvQuery.data, cvQuery.error, cvQuery.isFetching]);

  const personId = state.cv?.personId ?? routePersonId;
  const tailoringPatch = state.cv?.tailoringPatch ?? null;
  const isScopedTailoredCv =
    state.cv?.bodyBlocksEditable === false ||
    (state.cv?.tailoringScope !== null && state.cv?.tailoringScope !== undefined);
  const canonicalEditMode =
    state.cv?.canonicalEditMode ?? (isScopedTailoredCv ? 'tailoringPatch' : 'bodyBlocks');
  const tailoredProfessionalSummary = isScopedTailoredCv
    ? patchProfessionalSummary.trim()
    : tailoringPatch?.professionalSummary?.trim() ?? '';
  const coreStrengths = isScopedTailoredCv
    ? parseLines(patchCoreStrengthsText)
    : tailoringPatch?.coreStrengths ?? state.cv?.coreStrengths ?? [];
  const selectedTechnicalEnvironment =
    isScopedTailoredCv
      ? parseLines(patchTechnicalEnvironmentText)
      : tailoringPatch?.selectedTechnicalEnvironment ?? state.cv?.selectedTechnicalEnvironment ?? [];
  const baseExperienceHighlightPatches =
    tailoringPatch?.experienceHighlightPatches ?? state.cv?.experienceHighlightPatches ?? [];
  const activeBaseExperienceHighlightPatches = useMemo(
    () =>
      baseExperienceHighlightPatches.filter(
        (patch: FilemakerCvExperienceHighlightPatch, index: number): boolean =>
          !removedExperiencePatchKeys.includes(getExperiencePatchKey(patch, index))
      ),
    [baseExperienceHighlightPatches, removedExperiencePatchKeys]
  );
  const editableExperiencePatchTargets = useMemo(
    () =>
      isScopedTailoredCv
        ? mergeExperiencePatchesWithBlocks(blocks, activeBaseExperienceHighlightPatches)
        : activeBaseExperienceHighlightPatches,
    [activeBaseExperienceHighlightPatches, blocks, isScopedTailoredCv]
  );
  const experienceHighlightPatches = isScopedTailoredCv
    ? editableExperiencePatchTargets.map(
        (patch: FilemakerCvExperienceHighlightPatch, index: number): FilemakerCvExperienceHighlightPatch => ({
          ...patch,
          highlights: parseLines(
            patchExperienceHighlightsText[getExperiencePatchKey(patch, index)] ??
              joinLines(patch.highlights)
          ),
        })
      )
    : editableExperiencePatchTargets;
  const persistedExperienceHighlightPatches = isScopedTailoredCv
    ? experienceHighlightPatches.filter(
        (patch: FilemakerCvExperienceHighlightPatch, index: number): boolean => {
          if (patch.highlights.length === 0) return false;
          const sourcePatch = editableExperiencePatchTargets[index];
          const wasGeneratedPatch =
            sourcePatch !== undefined && activeBaseExperienceHighlightPatches.includes(sourcePatch);
          const originalHighlights = joinLines(sourcePatch?.highlights ?? []);
          const nextHighlights = joinLines(patch.highlights);
          return wasGeneratedPatch || nextHighlights !== originalHighlights;
        }
      )
    : experienceHighlightPatches;
  const loadedProfessionalSummary =
    state.cv?.tailoringPatch?.professionalSummary ?? state.cv?.professionalSummary ?? '';
  const loadedCoreStrengths = state.cv?.tailoringPatch?.coreStrengths ?? state.cv?.coreStrengths ?? [];
  const loadedTechnicalEnvironment =
    state.cv?.tailoringPatch?.selectedTechnicalEnvironment ??
    state.cv?.selectedTechnicalEnvironment ??
    [];
  const summaryPatchChanged =
    isScopedTailoredCv && patchProfessionalSummary.trim() !== loadedProfessionalSummary.trim();
  const coreStrengthsPatchChanged =
    isScopedTailoredCv && !areStringListsEqual(parseLines(patchCoreStrengthsText), loadedCoreStrengths);
  const technicalEnvironmentPatchChanged =
    isScopedTailoredCv &&
    !areStringListsEqual(parseLines(patchTechnicalEnvironmentText), loadedTechnicalEnvironment);
  const experiencePatchesChanged =
    isScopedTailoredCv &&
    (removedExperiencePatchKeys.length > 0 ||
      !areExperiencePatchesEqual(
        persistedExperienceHighlightPatches,
        baseExperienceHighlightPatches
      ));
  const hasScopedPatchChanges =
    summaryPatchChanged ||
    coreStrengthsPatchChanged ||
    technicalEnvironmentPatchChanged ||
    experiencePatchesChanged;
  const tailoringScope = state.cv?.tailoringScope ?? null;
  const canonicalPatchField = tailoringScope?.canonicalPatchField ?? 'tailoringPatch';
  const renderedBodyMode = tailoringScope?.renderedBodyMode ?? 'ai_rendered_full_cv';
  const sourceCvTitle = state.cv?.sourceCvTitle?.trim() ?? '';
  const sourceCvRecordId = state.cv?.sourceCvRecordId?.trim() ?? '';
  const canOpenSourceCv =
    sourceCvRecordId.length > 0 &&
    sourceCvRecordId !== 'profile-fields-only' &&
    sourceCvRecordId !== state.cv?.id;
  const sourceCvLabel = sourceCvTitle.length > 0 ? sourceCvTitle : sourceCvRecordId;
  const isProfileFieldsOnlySource = !canOpenSourceCv && sourceCvRecordId === 'profile-fields-only';
  const hasTailoringMetadata =
    tailoringScope !== null ||
    tailoredProfessionalSummary.length > 0 ||
    coreStrengths.length > 0 ||
    selectedTechnicalEnvironment.length > 0 ||
    experienceHighlightPatches.length > 0;
  const draftTailoringPatch = useMemo<FilemakerCvTailoringPatch | null>(() => {
    if (!isScopedTailoredCv) return tailoringPatch;
    return {
      professionalSummary:
        patchProfessionalSummary.trim().length > 0 ? patchProfessionalSummary.trim() : null,
      coreStrengths,
      selectedTechnicalEnvironment,
      experienceHighlightPatches: persistedExperienceHighlightPatches,
    };
  }, [
    coreStrengths,
    isScopedTailoredCv,
    patchProfessionalSummary,
    persistedExperienceHighlightPatches,
    selectedTechnicalEnvironment,
    tailoringPatch,
  ]);
  const previewBlocks = useMemo(
    () =>
      isScopedTailoredCv
        ? applyTailoringPatchToPreviewBlocks(blocks, draftTailoringPatch)
        : blocks,
    [blocks, draftTailoringPatch, isScopedTailoredCv]
  );
  const previewHtml = useMemo(
    () =>
      compileCvBlocksToHtml(previewBlocks, {
        highlightedTechnologyTerms: state.cv?.highlightTechnologyTerms ?? [],
      }),
    [previewBlocks, state.cv?.highlightTechnologyTerms]
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    if (hasScopedPatchChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => {
      if (hasScopedPatchChanges) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [hasScopedPatchChanges]);

  const applyLoadedCv = useCallback((cv: FilemakerCv): void => {
    const normalizedBlocks = normalizeCvBlocks(cv.bodyBlocks);
    setState({ cv, error: null, isLoading: false });
    setTitle(cv.title);
    setStatus(cv.status);
    setBlocks(normalizedBlocks);
    setSelectedBlockId((current) => current ?? firstBlockId(normalizedBlocks));
    setPatchProfessionalSummary(cv.tailoringPatch?.professionalSummary ?? '');
    setPatchCoreStrengthsText(joinLines(cv.tailoringPatch?.coreStrengths ?? cv.coreStrengths));
    setPatchTechnicalEnvironmentText(
      joinLines(cv.tailoringPatch?.selectedTechnicalEnvironment ?? cv.selectedTechnicalEnvironment)
    );
    setPatchExperienceHighlightsText(
      buildExperienceHighlightsTextMap(
        cv.tailoringPatch?.experienceHighlightPatches ?? cv.experienceHighlightPatches
      )
    );
    setRemovedExperiencePatchKeys([]);
  }, []);

  const persistCurrentCv = useCallback(async (): Promise<FilemakerCv> => {
    if (state.cv === null) throw new Error('CV is not loaded.');
    const isScopedCv = state.cv.tailoringScope !== null && state.cv.tailoringScope !== undefined;
    const scopedTailoringPatch: FilemakerCvTailoringPatch =
      draftTailoringPatch ?? {
        professionalSummary: null,
        coreStrengths: [],
        selectedTechnicalEnvironment: [],
        experienceHighlightPatches: [],
      };
    const response = await fetch(`/api/filemaker/cvs/${encodeURIComponent(state.cv.id)}`, {
      method: 'PATCH',
      headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        ...(isScopedCv
          ? {
              coreStrengths: scopedTailoringPatch.coreStrengths,
              professionalSummary: scopedTailoringPatch.professionalSummary,
              selectedTechnicalEnvironment: scopedTailoringPatch.selectedTechnicalEnvironment,
              tailoringPatch: scopedTailoringPatch,
            }
          : {
              bodyBlocks: blocks,
            }),
        status,
        title,
      }),
    });
    if (!response.ok) throw new Error(`Failed to save CV (${response.status}).`);
    const payload = (await response.json()) as CvPatchResponse;
    if ((payload.meta?.ignoredFields ?? []).length > 0) {
      toast(`Ignored non-canonical fields: ${(payload.meta?.ignoredFields ?? []).join(', ')}.`);
    }
    applyLoadedCv(payload.cv);
    return payload.cv;
  }, [
    applyLoadedCv,
    blocks,
    draftTailoringPatch,
    patchCoreStrengthsText,
    patchExperienceHighlightsText,
    patchProfessionalSummary,
    patchTechnicalEnvironmentText,
    state.cv,
    status,
    title,
    toast,
  ]);

  const handleBackToPerson = useCallback((): void => {
    if (
      hasScopedPatchChanges &&
      !window.confirm('Discard unsaved tailored CV patch changes?')
    ) {
      return;
    }
    startTransition(() => {
      router.push(`/admin/filemaker/persons/${encodeURIComponent(personId)}`);
    });
  }, [hasScopedPatchChanges, personId, router]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (state.cv === null) return;
    setIsSaving(true);
    try {
      await persistCurrentCv();
      toast('CV saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save CV.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [persistCurrentCv, state.cv, toast]);

  const handlePreviewPdf = useCallback((): void => {
    try {
      openFilemakerCvPdfPreview(previewHtml);
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to preview CV PDF.', {
        variant: 'error',
      });
    }
  }, [previewHtml, toast]);

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (state.cv === null) return;
    setIsExporting(true);
    try {
      const savedCv = await persistCurrentCv();
      const response = await fetch('/api/filemaker/cvs/export-pdf', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ cvId: savedCv.id }),
      });
      if (!response.ok) throw new Error(`Failed to export CV (${response.status}).`);
      const fallbackTitle = savedCv.title.trim().length > 0 ? savedCv.title : savedCv.id;
      const filename = readDownloadFilename(response, `${fallbackTitle}.pdf`);
      downloadBlob(await response.blob(), filename);
      toast('CV PDF exported.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to export CV PDF.', {
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }, [persistCurrentCv, state.cv, toast]);

  if (state.cv === null) {
    return (
      <div className='page-section-compact space-y-6'>
        <SectionHeader
          title='CV Creator'
          description={state.isLoading ? 'Loading CV.' : state.error ?? 'CV not found.'}
          eyebrow={
            <AdminFilemakerBreadcrumbs
              parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
              current='CV Creator'
              className='mb-2'
            />
          }
          actions={<FormActions onCancel={handleBackToPerson} cancelText='Back to Person' />}
        />
      </div>
    );
  }

  return (
    <div className='page-section-compact space-y-6'>
      <SectionHeader
        title='CV Creator'
        description={`Linked to ${state.cv.personName}.`}
        eyebrow={
          <AdminFilemakerBreadcrumbs
            parent={{ label: 'Persons', href: '/admin/filemaker/persons' }}
            current='CV Creator'
            className='mb-2'
          />
        }
        actions={
          <FormActions
            onCancel={handleBackToPerson}
            onSave={() => {
              void handleSave();
            }}
            cancelText='Back to Person'
            saveText={isScopedTailoredCv ? 'Save Patch' : 'Save CV'}
            isSaving={isSaving}
            saveIcon={<Save className='size-3.5' />}
          >
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handlePreviewPdf}
              className='gap-2'
            >
              <Eye className='size-3.5' />
              Preview PDF
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isExporting}
              loading={isExporting}
              loadingText='Exporting...'
              onClick={() => {
                void handleExportPdf();
              }}
              className='gap-2'
            >
              {!isExporting ? <Download className='size-3.5' /> : null}
              Export PDF
            </Button>
          </FormActions>
        }
      />

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline' className='text-[10px]'>
          Status: {state.cv.status}
        </Badge>
        <Badge variant='outline' className='text-[10px]'>
          Updated: {formatTimestamp(state.cv.updatedAt)}
        </Badge>
      </div>

      {hasTailoringMetadata ? (
        <FormSection title='Tailored Application Scope' className='space-y-4 p-4'>
          <div className='rounded-lg border border-amber-200/70 bg-amber-50/80 p-3 text-sm text-amber-950'>
            This CV is application-tailored. Identity, contact details, education, languages,
            employers, roles, dates, locations, certifications, and section order should remain
            unchanged.
          </div>
          {isScopedTailoredCv ? (
            <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/30 p-3 text-xs text-muted-foreground'>
              <span>
                Canonical edit target:{' '}
                <span className='font-medium text-foreground'>{canonicalEditMode}</span>
              </span>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant={hasScopedPatchChanges ? 'secondary' : 'outline'} className='text-[10px]'>
                  {hasScopedPatchChanges ? 'Unsaved patch changes' : 'No patch changes'}
                </Badge>
                {hasScopedPatchChanges ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-2 text-[10px]'
                    onClick={() => {
                      setPatchProfessionalSummary(
                        state.cv?.tailoringPatch?.professionalSummary ??
                          state.cv?.professionalSummary ??
                          ''
                      );
                      setPatchCoreStrengthsText(
                        joinLines(state.cv?.tailoringPatch?.coreStrengths ?? state.cv?.coreStrengths)
                      );
                      setPatchTechnicalEnvironmentText(
                        joinLines(
                          state.cv?.tailoringPatch?.selectedTechnicalEnvironment ??
                            state.cv?.selectedTechnicalEnvironment
                        )
                      );
                      setPatchExperienceHighlightsText(
                        buildExperienceHighlightsTextMap(
                          state.cv?.tailoringPatch?.experienceHighlightPatches ??
                            state.cv?.experienceHighlightPatches
                        )
                      );
                      setRemovedExperiencePatchKeys([]);
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Discard changes
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {sourceCvTitle.length > 0 || sourceCvRecordId.length > 0 ? (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/30 p-3 text-xs text-muted-foreground'>
              <div>
                Based on CV:{' '}
                <span className='font-medium text-foreground'>
                  {sourceCvLabel}
                </span>
              </div>
              {canOpenSourceCv ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 gap-1.5 text-[11px]'
                  onClick={() => {
                    if (
                      hasScopedPatchChanges &&
                      !window.confirm('Discard unsaved tailored CV patch changes?')
                    ) {
                      return;
                    }
                    startTransition(() => {
                      router.push(
                        `/admin/filemaker/persons/${encodeURIComponent(personId)}/cvs/${encodeURIComponent(sourceCvRecordId)}`
                      );
                    });
                  }}
                >
                  <ExternalLink className='size-3' />
                  Open source CV
                </Button>
              ) : null}
              {isProfileFieldsOnlySource ? (
                <Badge variant='outline' className='text-[10px]'>
                  Profile fields only
                </Badge>
              ) : null}
            </div>
          ) : null}
          {tailoredProfessionalSummary.length > 0 ? (
            <div className='rounded-lg border border-border/60 bg-card/30 p-3'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Tailored professional summary
              </div>
              <p className='text-sm leading-6 text-foreground/80'>{tailoredProfessionalSummary}</p>
            </div>
          ) : null}
          {tailoringScope?.allowedSections !== undefined && tailoringScope.allowedSections.length > 0 ? (
            <div className='space-y-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                Editable sections
              </div>
              <div className='flex flex-wrap gap-2'>
                {tailoringScope.allowedSections.map((section) => (
                  <Badge key={section} variant='outline' className='text-[10px]'>
                    {section}
                  </Badge>
                ))}
              </div>
              <div className='mt-2 text-[11px] text-muted-foreground'>
                Edit mode: {canonicalEditMode}; canonical patch: {canonicalPatchField}; rendered
                body: {renderedBodyMode}
              </div>
            </div>
          ) : null}
          {isScopedTailoredCv ? (
            <div className='grid gap-3 lg:grid-cols-3'>
              <FormField label='Professional summary' className='lg:col-span-3'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  {summaryPatchChanged ? (
                    <Badge variant='secondary' className='text-[10px]'>
                      Changed
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-2 text-[10px]'
                    onClick={() => {
                      setPatchProfessionalSummary(
                        state.cv?.tailoringPatch?.professionalSummary ??
                          state.cv?.professionalSummary ??
                          ''
                      );
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Reset
                  </Button>
                </div>
                <Textarea
                  value={patchProfessionalSummary}
                  onChange={(event) => {
                    setPatchProfessionalSummary(event.target.value);
                  }}
                  rows={4}
                  className='min-h-24'
                  aria-label='Tailored CV professional summary patch'
                />
              </FormField>
              <FormField label='Core strengths'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  {coreStrengthsPatchChanged ? (
                    <Badge variant='secondary' className='text-[10px]'>
                      Changed
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-2 text-[10px]'
                    onClick={() => {
                      setPatchCoreStrengthsText(
                        joinLines(state.cv?.tailoringPatch?.coreStrengths ?? state.cv?.coreStrengths)
                      );
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Reset
                  </Button>
                </div>
                <Textarea
                  value={patchCoreStrengthsText}
                  onChange={(event) => {
                    setPatchCoreStrengthsText(event.target.value);
                  }}
                  rows={7}
                  className='min-h-36'
                  aria-label='Tailored CV core strengths patch'
                />
              </FormField>
              <FormField label='Selected technical environment'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  {technicalEnvironmentPatchChanged ? (
                    <Badge variant='secondary' className='text-[10px]'>
                      Changed
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-2 text-[10px]'
                    onClick={() => {
                      setPatchTechnicalEnvironmentText(
                        joinLines(
                          state.cv?.tailoringPatch?.selectedTechnicalEnvironment ??
                            state.cv?.selectedTechnicalEnvironment
                        )
                      );
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Reset
                  </Button>
                </div>
                <Textarea
                  value={patchTechnicalEnvironmentText}
                  onChange={(event) => {
                    setPatchTechnicalEnvironmentText(event.target.value);
                  }}
                  rows={7}
                  className='min-h-36'
                  aria-label='Tailored CV technical environment patch'
                />
              </FormField>
              <div className='rounded-lg border border-border/60 bg-card/30 p-3 text-xs leading-5 text-muted-foreground'>
                Save updates the canonical `tailoringPatch`. The full CV body is regenerated from
                the source CV plus this patch, so locked fields stay protected.
              </div>
            </div>
          ) : null}
          <div className='grid gap-3 lg:grid-cols-2'>
            {coreStrengths.length > 0 ? (
              <div className='rounded-lg border border-border/60 bg-card/30 p-3'>
                <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Tailored core strengths
                </div>
                <div className='flex flex-wrap gap-2'>
                  {coreStrengths.map((strength) => (
                    <Badge key={strength} variant='secondary' className='text-[10px]'>
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {selectedTechnicalEnvironment.length > 0 ? (
              <div className='rounded-lg border border-border/60 bg-card/30 p-3'>
                <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                  Selected technical environment
                </div>
                <div className='flex flex-wrap gap-2'>
                  {selectedTechnicalEnvironment.map((technology) => (
                    <Badge key={technology} variant='outline' className='text-[10px]'>
                      {technology}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {experienceHighlightPatches.length > 0 ? (
            <div className='space-y-3'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                    Tailored experience highlights
                  </div>
                  {experiencePatchesChanged ? (
                    <Badge variant='secondary' className='text-[10px]'>
                      Changed
                    </Badge>
                  ) : null}
                </div>
                {isScopedTailoredCv && removedExperiencePatchKeys.length > 0 ? (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-6 gap-1 px-2 text-[10px]'
                    onClick={() => {
                      setRemovedExperiencePatchKeys([]);
                    }}
                  >
                    <RotateCcw className='size-3' />
                    Restore removed patches
                  </Button>
                ) : null}
              </div>
              {isScopedTailoredCv && removedExperiencePatchKeys.length > 0 ? (
                <div className='rounded border border-red-300/20 bg-red-400/5 p-2 text-[11px] leading-4 text-red-100'>
                  {removedExperiencePatchKeys.length} generated experience patch
                  {removedExperiencePatchKeys.length === 1 ? '' : 'es'} removed. Source CV
                  highlights will be used for those sections unless restored before saving.
                </div>
              ) : null}
              <div className='grid gap-3 lg:grid-cols-2'>
                {experienceHighlightPatches.map((patch, index) => (
                  <div
                    key={getExperiencePatchKey(patch, index)}
                    className='rounded-lg border border-border/60 bg-card/30 p-3'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-xs font-semibold text-foreground'>
                        {formatExperiencePatchLabel(patch)}
                      </div>
                      {isScopedTailoredCv ? (
                        <Badge
                          variant={persistedExperienceHighlightPatches.includes(patch) ? 'secondary' : 'outline'}
                          className='text-[10px]'
                        >
                          {persistedExperienceHighlightPatches.includes(patch)
                            ? 'Saved patch'
                            : 'No-op until edited'}
                        </Badge>
                      ) : null}
                      {isScopedTailoredCv ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-[10px]'
                          onClick={() => {
                            const key = getExperiencePatchKey(patch, index);
                            setPatchExperienceHighlightsText((current) => {
                              const next = { ...current };
                              delete next[key];
                              return next;
                            });
                          }}
                        >
                          <RotateCcw className='size-3' />
                          Reset
                        </Button>
                      ) : null}
                      {isScopedTailoredCv &&
                      activeBaseExperienceHighlightPatches.includes(
                        editableExperiencePatchTargets[index] as FilemakerCvExperienceHighlightPatch
                      ) ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-[10px] text-red-300 hover:text-red-200'
                          onClick={() => {
                            const sourcePatch = editableExperiencePatchTargets[index];
                            if (sourcePatch === undefined) return;
                            const baseIndex = baseExperienceHighlightPatches.indexOf(sourcePatch);
                            const removedKey = getExperiencePatchKey(sourcePatch, baseIndex);
                            const displayKey = getExperiencePatchKey(patch, index);
                            setRemovedExperiencePatchKeys((current) =>
                              current.includes(removedKey) ? current : [...current, removedKey]
                            );
                            setPatchExperienceHighlightsText((current) => {
                              const next = { ...current };
                              delete next[displayKey];
                              return next;
                            });
                          }}
                        >
                          <Trash2 className='size-3' />
                          Remove patch
                        </Button>
                      ) : null}
                    </div>
                    {isScopedTailoredCv ? (
                      <Textarea
                        value={
                          patchExperienceHighlightsText[getExperiencePatchKey(patch, index)] ??
                          joinLines(patch.highlights)
                        }
                        onChange={(event) => {
                          const key = getExperiencePatchKey(patch, index);
                          setPatchExperienceHighlightsText((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }));
                        }}
                        rows={6}
                        className='mt-2 min-h-32'
                        aria-label={`Tailored CV experience highlights patch ${index + 1}`}
                      />
                    ) : (
                      <ul className='mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground'>
                        {patch.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </FormSection>
      ) : null}

      <FormSection title='CV Details' className='space-y-4 p-4'>
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]'>
          <FormField label='Title'>
            <Input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              className='h-9'
            />
          </FormField>
          <FormField label='Status'>
            <select
              value={status}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>): void => {
                const nextStatus = event.target.value;
                if (
                  nextStatus === 'draft' ||
                  nextStatus === 'published' ||
                  nextStatus === 'archived'
                ) {
                  setStatus(nextStatus);
                }
              }}
              aria-label='CV status'
              className='h-9 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 transition-colors focus:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2'
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title={isScopedTailoredCv ? 'Generated CV Preview' : 'Builder'} className='space-y-4 p-4'>
        {isScopedTailoredCv ? (
          <div className='space-y-3'>
            <div className='rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs leading-5 text-emerald-100'>
              This scoped tailored CV is rendered from the source CV and the canonical patch above.
              Full block editing is disabled here to prevent accidental changes to locked fields.
            </div>
            <div className='rounded-md border border-border/60 bg-card/20 p-2'>
              <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Current saved preview
              </div>
              <iframe
                title='CV preview'
                srcDoc={previewHtml}
                className='h-[760px] w-full rounded border border-border/40 bg-white'
              />
            </div>
          </div>
        ) : (
          <>
            <CvBlockPicker
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onChange={setBlocks}
              onSelectBlock={setSelectedBlockId}
            />
            <div className='grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]'>
              <CvLayerPanel
                blocks={blocks}
                onChange={setBlocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                className='rounded-md border border-border/60 bg-card/20 p-2'
              />
              <div className='rounded-md border border-border/60 bg-card/20 p-2'>
                <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                  Preview
                </div>
                <iframe
                  title='CV preview'
                  srcDoc={previewHtml}
                  className='h-[760px] w-full rounded border border-border/40 bg-white'
                />
              </div>
              <CvBlockSettingsPanel
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onChange={setBlocks}
                onSelectBlock={setSelectedBlockId}
              />
            </div>
          </>
        )}
      </FormSection>
    </div>
  );
}
