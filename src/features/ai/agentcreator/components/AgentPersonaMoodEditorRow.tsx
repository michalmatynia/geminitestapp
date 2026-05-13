'use client';

import { Trash2 } from 'lucide-react';
import type React from 'react';

import type { AgentPersonaMood } from '@/shared/contracts/agents';
import { DEFAULT_AGENT_PERSONA_MOOD_ID } from '@/shared/contracts/agents';
import { Button, Textarea } from '@/shared/ui/primitives.public';
import { FileUploadButton, FormField } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { AgentPersonaMoodAvatar } from './AgentPersonaMoodAvatar';
import { IMPORT_MIME_OPTIONS } from './mood-editor/agent-persona-mood-editor.shared';

type MoodRowHeaderProps = {
  mood: AgentPersonaMood;
};

function MoodRowHeader({ mood }: MoodRowHeaderProps): React.JSX.Element {
  return (
    <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
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
  );
}

type MoodRowToolbarProps = {
  mood: AgentPersonaMood;
  hasEmbeddedThumbnailOption: boolean;
  hasAvatarImageUrl: boolean;
  onFilesSelected: (files: File[]) => void;
  onUploadError: (error: unknown) => void;
  onClearImage: () => void;
  onToggleEmbedded: () => void;
  onRemoveMood: () => void;
};

function MoodRowToolbar({
  mood,
  hasEmbeddedThumbnailOption,
  hasAvatarImageUrl,
  onFilesSelected,
  onUploadError,
  onClearImage,
  onToggleEmbedded,
  onRemoveMood,
}: MoodRowToolbarProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <FileUploadButton
        variant='outline'
        size='sm'
        accept='.svg,image/svg+xml,image/*'
        multiple={false}
        enablePaste
        onFilesSelected={onFilesSelected}
        onError={onUploadError}
      >
        Upload or Paste Image
      </FileUploadButton>
      {hasAvatarImageUrl ? (
        <Button type='button' variant='ghost' size='sm' onClick={onClearImage}>
          Clear image
        </Button>
      ) : null}
      {hasEmbeddedThumbnailOption ? (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          aria-pressed={mood.useEmbeddedThumbnail === true}
          onClick={onToggleEmbedded}
        >
          {mood.useEmbeddedThumbnail === true
            ? 'Use file URL in Kangur'
            : 'Use embedded thumbnail in Kangur'}
        </Button>
      ) : null}
      {mood.id !== DEFAULT_AGENT_PERSONA_MOOD_ID ? (
        <Button type='button' variant='ghost' size='sm' onClick={onRemoveMood}>
          <Trash2 className='mr-1.5 size-3.5' />
          Remove
        </Button>
      ) : null}
    </div>
  );
}

type MoodRowPastePanelProps = {
  importMime: string;
  importValue: string;
  onImportValueChange: (value: string) => void;
  onImportMimeChange: (mime: string) => void;
  onImportSubmit: () => void;
};

function MoodRowPastePanel({
  importMime,
  importValue,
  onImportValueChange,
  onImportMimeChange,
  onImportSubmit,
}: MoodRowPastePanelProps): React.JSX.Element {
  return (
    <FormField
      label='Paste Base64 or Data URL'
      description='Paste a full data URL, raw base64 plus MIME type, or raw SVG markup.'
    >
      <div className='space-y-3'>
        <Textarea
          value={importValue}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            onImportValueChange(event.target.value)
          }
          placeholder='data:image/png;base64,... or raw SVG markup'
          className='min-h-[120px] font-mono text-xs'
          spellCheck={false}
          aria-label='data:image/png;base64,... or raw SVG markup'
          title='data:image/png;base64,... or raw SVG markup'
        />
        <div className='flex flex-wrap items-end gap-3'>
          <FormField
            label='Base64 MIME'
            description='Used only when the pasted value is raw base64 instead of a data URL.'
            className='min-w-[180px]'
          >
            <select
              value={importMime}
              onChange={(event) => onImportMimeChange(event.target.value)}
              aria-label='Base64 MIME'
              title='Base64 MIME'
              className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2'
            >
              {IMPORT_MIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <Button type='button' variant='outline' size='sm' onClick={onImportSubmit}>
            Import pasted avatar
          </Button>
        </div>
      </div>
    </FormField>
  );
}

type MoodRowSvgPanelProps = {
  mood: AgentPersonaMood;
  onSvgChange: (value: string) => void;
};

function MoodRowSvgPanel({ mood, onSvgChange }: MoodRowSvgPanelProps): React.JSX.Element {
  const placeholder = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <!-- ${mood.label} avatar -->\n</svg>`;
  return (
    <FormField
      label='Inline SVG Markup'
      description='Editing SVG markup switches this mood back to inline SVG mode.'
    >
      <Textarea
        value={mood.svgContent}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => onSvgChange(event.target.value)}
        placeholder={placeholder}
        className='min-h-[180px] font-mono text-xs'
        spellCheck={false}
        aria-label={placeholder}
        title={placeholder}
      />
    </FormField>
  );
}

export type AgentPersonaMoodEditorRowProps = {
  mood: AgentPersonaMood;
  importMime: string;
  importValue: string;
  onImportValueChange: (value: string) => void;
  onImportMimeChange: (mime: string) => void;
  onFilesSelected: (files: File[]) => void;
  onUploadError: (error: unknown) => void;
  onClearImage: () => void;
  onToggleEmbedded: () => void;
  onRemoveMood: () => void;
  onImportSubmit: () => void;
  onSvgChange: (value: string) => void;
};

export function AgentPersonaMoodEditorRow({
  mood,
  importMime,
  importValue,
  onImportValueChange,
  onImportMimeChange,
  onFilesSelected,
  onUploadError,
  onClearImage,
  onToggleEmbedded,
  onRemoveMood,
  onImportSubmit,
  onSvgChange,
}: AgentPersonaMoodEditorRowProps): React.JSX.Element {
  const dataUrl = mood.avatarThumbnailDataUrl?.trim() ?? '';
  const thumbRef = mood.avatarThumbnailRef?.trim() ?? '';
  const hasEmbeddedThumbnailOption = dataUrl.length > 0 || thumbRef.length > 0;
  const avatarUrl = mood.avatarImageUrl?.trim() ?? '';
  const hasAvatarImageUrl = avatarUrl.length > 0;

  return (
    <div className='space-y-3 rounded-xl border border-border/60 bg-card/35 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <MoodRowHeader mood={mood} />
        <MoodRowToolbar
          mood={mood}
          hasEmbeddedThumbnailOption={hasEmbeddedThumbnailOption}
          hasAvatarImageUrl={hasAvatarImageUrl}
          onFilesSelected={onFilesSelected}
          onUploadError={onUploadError}
          onClearImage={onClearImage}
          onToggleEmbedded={onToggleEmbedded}
          onRemoveMood={onRemoveMood}
        />
      </div>

      <MoodRowPastePanel
        importMime={importMime}
        importValue={importValue}
        onImportValueChange={onImportValueChange}
        onImportMimeChange={onImportMimeChange}
        onImportSubmit={onImportSubmit}
      />

      <MoodRowSvgPanel mood={mood} onSvgChange={onSvgChange} />
    </div>
  );
}
