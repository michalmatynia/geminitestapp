'use client';

import { Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  base64ToFile,
  dataUrlToFile,
  deletePersonaAvatar,
  deletePersonaAvatarThumbnail,
  isImageDataUrl,
  isInlineSvgMarkup,
  uploadPersonaAvatar,
} from '@/features/ai/agentcreator/utils/avatar-input';
import {
  AGENT_PERSONA_MOOD_PRESETS,
  buildAgentPersonaMood,
  buildDefaultAgentPersonaMoods,
  collectAgentPersonaAvatarFileIds,
  collectAgentPersonaAvatarThumbnailRefs,
} from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import { DEFAULT_AGENT_PERSONA_MOOD_ID } from '@/shared/contracts/agents';
import {
  Button,
  FileUploadButton,
  FormField,
  Textarea,
  useToast,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { AgentPersonaMoodAvatar } from './AgentPersonaMoodAvatar';

type AgentPersonaMoodEditorProps = {
  moods?: AgentPersonaMood[] | null;
  originalMoods?: AgentPersonaMood[] | null;
  personaId?: string | null;
  onChange: (updates: {
    moods: AgentPersonaMood[];
    defaultMoodId: AgentPersonaMoodId;
  }) => void;
};

const DEFAULT_IMPORT_MIME = 'image/png';
const IMPORT_MIME_OPTIONS = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/gif', label: 'GIF' },
  { value: 'image/svg+xml', label: 'SVG' },
] as const;

const MOOD_ORDER = new Map<AgentPersonaMoodId, number>(
  AGENT_PERSONA_MOOD_PRESETS.map((preset, index) => [preset.id, index])
);

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const sortMoods = (moods: AgentPersonaMood[]): AgentPersonaMood[] =>
  [...moods].sort(
    (left, right) =>
      (MOOD_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (MOOD_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );

export function AgentPersonaMoodEditor({
  moods,
  originalMoods,
  personaId,
  onChange,
}: AgentPersonaMoodEditorProps): React.JSX.Element {
  const { toast } = useToast();
  const effectiveMoods = useMemo(
    () =>
      Array.isArray(moods) && moods.length > 0 ? sortMoods(moods) : buildDefaultAgentPersonaMoods(),
    [moods]
  );
  const originalAvatarFileIds = useMemo(
    () => new Set(collectAgentPersonaAvatarFileIds({ moods: originalMoods ?? [] })),
    [originalMoods]
  );
  const originalAvatarThumbnailRefs = useMemo(
    () => new Set(collectAgentPersonaAvatarThumbnailRefs({ moods: originalMoods ?? [] })),
    [originalMoods]
  );
  const missingMoodPresets = useMemo(
    () =>
      AGENT_PERSONA_MOOD_PRESETS.filter(
        (preset) => !effectiveMoods.some((mood) => mood.id === preset.id)
      ),
    [effectiveMoods]
  );
  const [nextMoodId, setNextMoodId] = useState<string>(missingMoodPresets[0]?.id ?? '');
  const [importValues, setImportValues] = useState<Record<string, string>>({});
  const [importMimeByMood, setImportMimeByMood] = useState<Record<string, string>>({});

  useEffect(() => {
    setNextMoodId((current) => {
      if (current && missingMoodPresets.some((preset) => preset.id === current)) {
        return current;
      }

      return missingMoodPresets[0]?.id ?? '';
    });
  }, [missingMoodPresets]);

  const emitMoods = (nextMoods: AgentPersonaMood[]): void => {
    onChange({
      moods: sortMoods(nextMoods),
      defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
    });
  };

  const updateMood = (
    moodId: AgentPersonaMoodId,
    updater: (mood: AgentPersonaMood) => AgentPersonaMood
  ): void => {
    emitMoods(
      effectiveMoods.map((candidate) => (candidate.id === moodId ? updater(candidate) : candidate))
    );
  };

  const deleteDraftAvatarFile = async (fileId: string | null | undefined): Promise<void> => {
    const normalizedFileId = typeof fileId === 'string' ? fileId.trim() : '';
    if (!normalizedFileId || originalAvatarFileIds.has(normalizedFileId)) {
      return;
    }

    try {
      await deletePersonaAvatar(normalizedFileId);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'AgentPersonaMoodEditor',
          action: 'deleteDraftAvatarFile',
          fileId: normalizedFileId,
        },
      });
    }
  };

  const deleteDraftAvatarThumbnail = async (
    thumbnailRef: string | null | undefined
  ): Promise<void> => {
    const normalizedRef = typeof thumbnailRef === 'string' ? thumbnailRef.trim() : '';
    if (!normalizedRef || originalAvatarThumbnailRefs.has(normalizedRef)) {
      return;
    }

    try {
      await deletePersonaAvatarThumbnail(normalizedRef);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'AgentPersonaMoodEditor',
          action: 'deleteDraftAvatarThumbnail',
          thumbnailRef: normalizedRef,
        },
      });
    }
  };

  const replaceMoodWithUpload = async (
    moodId: AgentPersonaMoodId,
    file: File
  ): Promise<void> => {
    const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
    if (!currentMood) {
      return;
    }

    const uploaded = await uploadPersonaAvatar({
      file,
      personaId: personaId ?? null,
      moodId,
    });

    updateMood(moodId, (mood) => ({
      ...mood,
      svgContent: '',
      avatarImageFileId: uploaded.id,
      avatarImageUrl: uploaded.filepath,
      avatarThumbnailRef: uploaded.thumbnail?.ref ?? null,
      avatarThumbnailDataUrl: uploaded.thumbnail?.dataUrl ?? null,
      avatarThumbnailMimeType: uploaded.thumbnail?.mimeType ?? null,
      avatarThumbnailBytes: uploaded.thumbnail?.bytes ?? null,
      avatarThumbnailWidth: uploaded.thumbnail?.width ?? null,
      avatarThumbnailHeight: uploaded.thumbnail?.height ?? null,
      useEmbeddedThumbnail: Boolean(uploaded.thumbnail?.dataUrl),
    }));
    await deleteDraftAvatarFile(currentMood.avatarImageFileId);
    await deleteDraftAvatarThumbnail(currentMood.avatarThumbnailRef);
  };

  const clearMoodImage = (moodId: AgentPersonaMoodId): void => {
    const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
    if (!currentMood) {
      return;
    }

    updateMood(moodId, (mood) => ({
      ...mood,
      avatarImageFileId: null,
      avatarImageUrl: null,
      avatarThumbnailRef: null,
      avatarThumbnailDataUrl: null,
      avatarThumbnailMimeType: null,
      avatarThumbnailBytes: null,
      avatarThumbnailWidth: null,
      avatarThumbnailHeight: null,
      useEmbeddedThumbnail: false,
    }));
    void deleteDraftAvatarFile(currentMood.avatarImageFileId);
    void deleteDraftAvatarThumbnail(currentMood.avatarThumbnailRef);
  };

  const setMoodSvgContent = (moodId: AgentPersonaMoodId, svgContent: string): void => {
    const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
    if (!currentMood) {
      return;
    }

    updateMood(moodId, (mood) => ({
      ...mood,
      svgContent,
      avatarImageFileId: null,
      avatarImageUrl: null,
      avatarThumbnailRef: null,
      avatarThumbnailDataUrl: null,
      avatarThumbnailMimeType: null,
      avatarThumbnailBytes: null,
      avatarThumbnailWidth: null,
      avatarThumbnailHeight: null,
      useEmbeddedThumbnail: false,
    }));
    void deleteDraftAvatarFile(currentMood.avatarImageFileId);
    void deleteDraftAvatarThumbnail(currentMood.avatarThumbnailRef);
  };

  const toggleEmbeddedThumbnail = (moodId: AgentPersonaMoodId): void => {
    updateMood(moodId, (mood) => ({
      ...mood,
      useEmbeddedThumbnail: !mood.useEmbeddedThumbnail,
    }));
  };

  const handleMoodAssetUpload = async (
    moodId: AgentPersonaMoodId,
    files: File[]
  ): Promise<void> => {
    const file = files[0];
    if (!file) {
      return;
    }

    try {
      await replaceMoodWithUpload(moodId, file);
      toast('Avatar uploaded.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AgentPersonaMoodEditor', action: 'uploadAvatar', moodId },
      });
      toast(error instanceof Error ? error.message : 'Failed to upload avatar.', {
        variant: 'error',
      });
    }
  };

  const handleImportSubmit = async (moodId: AgentPersonaMoodId): Promise<void> => {
    const rawValue = importValues[moodId]?.trim() ?? '';
    if (!rawValue) {
      toast('Paste SVG markup, a data URL, or raw base64 first.', { variant: 'error' });
      return;
    }

    try {
      if (isInlineSvgMarkup(rawValue)) {
        setMoodSvgContent(moodId, rawValue);
      } else {
        const mimeType = importMimeByMood[moodId] ?? DEFAULT_IMPORT_MIME;
        const fileExtension = MIME_TO_EXTENSION[mimeType] ?? 'bin';
        const file = isImageDataUrl(rawValue)
          ? dataUrlToFile(rawValue, `persona-${moodId}.${fileExtension}`)
          : base64ToFile(rawValue, mimeType, `persona-${moodId}.${fileExtension}`);
        await replaceMoodWithUpload(moodId, file);
      }

      setImportValues((current) => ({ ...current, [moodId]: '' }));
      toast('Avatar imported.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AgentPersonaMoodEditor', action: 'importAvatar', moodId },
      });
      toast(error instanceof Error ? error.message : 'Failed to import avatar.', {
        variant: 'error',
      });
    }
  };

  const handleRemoveMood = (moodId: AgentPersonaMoodId): void => {
    const currentMood = effectiveMoods.find((candidate) => candidate.id === moodId) ?? null;
    emitMoods(effectiveMoods.filter((candidate) => candidate.id !== moodId));
    void deleteDraftAvatarFile(currentMood?.avatarImageFileId);
    void deleteDraftAvatarThumbnail(currentMood?.avatarThumbnailRef);
  };

  return (
    <div className='space-y-4'>
      <FormField
        label='Tutor Mood Avatars'
        description='Neutral is the fixed default mood. Add optional tutor states and assign each one an avatar.'
      >
        <div className='space-y-4'>
          <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-xs text-gray-400'>
            Uploaded and pasted images are stored as files. Inline SVG markup is still supported
            for advanced avatar editing and is sanitized on save and at render time. Raster uploads
            can also expose a tiny embedded thumbnail for Kangur&apos;s always-visible tutor avatar.
          </div>

          {effectiveMoods.map((mood) => {
            const importMime = importMimeByMood[mood.id] ?? DEFAULT_IMPORT_MIME;
            const hasEmbeddedThumbnailOption = Boolean(
              mood.avatarThumbnailDataUrl?.trim() || mood.avatarThumbnailRef?.trim()
            );

            return (
              <div
                key={mood.id}
                className='space-y-3 rounded-xl border border-border/60 bg-card/35 p-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <AgentPersonaMoodAvatar
                      svgContent={mood.svgContent}
                      avatarImageUrl={mood.avatarImageUrl}
                      label={`${mood.label} avatar preview`}
                      className='h-16 w-16 border border-foreground/10 bg-white/5'
                      fallbackIconClassName='text-gray-300'
                      data-testid={`agent-persona-mood-preview-${mood.id}`}
                    />
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm font-semibold text-white'>{mood.label}</span>
                        <span className='rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400'>
                          {mood.id}
                        </span>
                        {mood.id === DEFAULT_AGENT_PERSONA_MOOD_ID ? (
                          <span className='rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300'>
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className='mt-1 text-xs leading-relaxed text-gray-400'>{mood.description}</p>
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <FileUploadButton
                      variant='outline'
                      size='sm'
                      accept='.svg,image/svg+xml,image/*'
                      multiple={false}
                      enablePaste
                      onFilesSelected={(files) => handleMoodAssetUpload(mood.id, files)}
                      onError={(error) => {
                        logClientError(error, {
                          context: { source: 'AgentPersonaMoodEditor', action: 'uploadAvatar', moodId: mood.id },
                        });
                      }}
                    >
                      Upload or Paste Image
                    </FileUploadButton>
                    {mood.avatarImageUrl ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => clearMoodImage(mood.id)}
                      >
                        Clear image
                      </Button>
                    ) : null}
                    {hasEmbeddedThumbnailOption ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        aria-pressed={mood.useEmbeddedThumbnail === true}
                        onClick={() => toggleEmbeddedThumbnail(mood.id)}
                      >
                        {mood.useEmbeddedThumbnail
                          ? 'Use file URL in Kangur'
                          : 'Use embedded thumbnail in Kangur'}
                      </Button>
                    ) : null}
                    {mood.id !== DEFAULT_AGENT_PERSONA_MOOD_ID ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemoveMood(mood.id)}
                      >
                        <Trash2 className='mr-1.5 size-3.5' />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                <FormField
                  label='Paste Base64 or Data URL'
                  description='Paste a full data URL, raw base64 plus MIME type, or raw SVG markup.'
                >
                  <div className='space-y-3'>
                    <Textarea
                      value={importValues[mood.id] ?? ''}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setImportValues((current) => ({ ...current, [mood.id]: event.target.value }))
                      }
                      placeholder='data:image/png;base64,... or raw SVG markup'
                      className='min-h-[120px] font-mono text-xs'
                      spellCheck={false}
                     aria-label='data:image/png;base64,... or raw SVG markup' title='data:image/png;base64,... or raw SVG markup'/>
                    <div className='flex flex-wrap items-end gap-3'>
                      <FormField
                        label='Base64 MIME'
                        description='Used only when the pasted value is raw base64 instead of a data URL.'
                        className='min-w-[180px]'
                      >
                        <select
                          value={importMime}
                          onChange={(event) =>
                            setImportMimeByMood((current) => ({
                              ...current,
                              [mood.id]: event.target.value,
                            }))
                          }
                          aria-label='Base64 MIME'
                          title='Base64 MIME'
                          className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2'
                        >
                          {IMPORT_MIME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          void handleImportSubmit(mood.id);
                        }}
                      >
                        Import pasted avatar
                      </Button>
                    </div>
                  </div>
                </FormField>

                <FormField
                  label='Inline SVG Markup'
                  description='Editing SVG markup switches this mood back to inline SVG mode.'
                >
                  <Textarea
                    value={mood.svgContent}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setMoodSvgContent(mood.id, event.target.value)
                    }
                    placeholder={`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <!-- ${mood.label} avatar -->\n</svg>`}
                    className='min-h-[180px] font-mono text-xs'
                    spellCheck={false}
                   aria-label={`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <!-- ${mood.label} avatar -->\n</svg>`} title={`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <!-- ${mood.label} avatar -->\n</svg>`}/>
                </FormField>
              </div>
            );
          })}

          {missingMoodPresets.length > 0 ? (
            <div className='rounded-xl border border-dashed border-border/70 bg-card/20 p-4'>
              <div className='flex flex-wrap items-end gap-3'>
                <FormField
                  label='Add Mood'
                  description='Optional tutor moods that can be used when the tutor is loading or replying.'
                  className='min-w-[220px] flex-1'
                >
                  <select
                    value={nextMoodId}
                    onChange={(event) => setNextMoodId(event.target.value)}
                    aria-label='Add mood'
                    title='Add mood'
                    className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {missingMoodPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!nextMoodId}
                  onClick={() => {
                    if (!nextMoodId) {
                      return;
                    }

                    emitMoods([
                      ...effectiveMoods,
                      buildAgentPersonaMood(nextMoodId as AgentPersonaMoodId),
                    ]);
                  }}
                >
                  <Plus className='mr-1.5 size-3.5' />
                  Add mood
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </FormField>
    </div>
  );
}
