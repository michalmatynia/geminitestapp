'use client';

import React from 'react';

import { FormField } from '@/shared/ui/forms-and-actions.public';

import { AgentPersonaMoodEditorRow } from './AgentPersonaMoodEditorRow';
import { AgentPersonaMoodEditorAddPresetPanel } from './AgentPersonaMoodEditorAddPresetPanel';
import type { AgentPersonaMoodEditorController } from './mood-editor/agent-persona-mood-editor-controller.types';
import { DEFAULT_IMPORT_MIME } from './mood-editor/agent-persona-mood-editor.shared';

type AgentPersonaMoodEditorViewProps = {
  editor: AgentPersonaMoodEditorController;
};

export function AgentPersonaMoodEditorView({ editor }: AgentPersonaMoodEditorViewProps): React.JSX.Element {
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

          {editor.effectiveMoods.map((mood) => {
            const importMime = editor.importMimeByMood[mood.id] ?? DEFAULT_IMPORT_MIME;
            return (
              <AgentPersonaMoodEditorRow
                key={mood.id}
                mood={mood}
                importMime={importMime}
                importValue={editor.importValues[mood.id] ?? ''}
                onImportValueChange={(value) =>
                  editor.setImportValues((current) => ({ ...current, [mood.id]: value }))
                }
                onImportMimeChange={(mime) =>
                  editor.setImportMimeByMood((current) => ({ ...current, [mood.id]: mime }))
                }
                onFilesSelected={(files) => {
                  editor.handleMoodAssetUpload(mood.id, files).catch(() => undefined);
                }}
                onUploadError={editor.logUploadError(mood.id)}
                onClearImage={() => {
                  editor.clearMoodImage(mood.id).catch(() => undefined);
                }}
                onToggleEmbedded={() => editor.toggleEmbeddedThumbnail(mood.id)}
                onRemoveMood={() => editor.handleRemoveMood(mood.id)}
                onImportSubmit={() => {
                  editor.handleImportSubmit(mood.id).catch(() => undefined);
                }}
                onSvgChange={(value) => {
                  editor.setMoodSvgContent(mood.id, value).catch(() => undefined);
                }}
              />
            );
          })}

          <AgentPersonaMoodEditorAddPresetPanel
            missingMoodPresets={editor.missingMoodPresets}
            nextMoodId={editor.nextMoodId}
            onNextMoodIdChange={editor.setNextMoodId}
            effectiveMoods={editor.effectiveMoods}
            onEmitMoods={editor.emitMoods}
          />
        </div>
      </FormField>
    </div>
  );
}
