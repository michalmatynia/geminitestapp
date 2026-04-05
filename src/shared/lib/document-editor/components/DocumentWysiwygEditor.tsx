'use client';

import React from 'react';

import {
  useOptionalTextEditorEngineProfile,
} from '@/shared/lib/text-editor-engine/hooks/useTextEditorEngineProfile';
import type {
  TextEditorEngineAppearance,
  TextEditorEngineInstance,
} from '@/shared/lib/text-editor-engine/types';
import { TextEditorEngineBrandButton } from '@/shared/ui/TextEditorEngineBrandButton';
import { cn } from '@/shared/utils/ui-utils';

import { RichTextEditor } from './RichTextEditor';

export type DocumentWysiwygEditorAppearance = TextEditorEngineAppearance;

export interface DocumentWysiwygEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  appearance?: DocumentWysiwygEditorAppearance | undefined;
  engineInstance?: TextEditorEngineInstance | undefined;
  showBrand?: boolean | undefined;
  brandClassName?: string | undefined;
  brandHref?: string | undefined;
  allowFontFamily?: boolean | undefined;
  allowTextAlign?: boolean | undefined;
  enableAdvancedTools?: boolean | undefined;
  allowImage?: boolean | undefined;
  allowTable?: boolean | undefined;
  allowTaskList?: boolean | undefined;
  loadingLabel?: string | undefined;
  toolbarClassName?: string | undefined;
  surfaceClassName?: string | undefined;
  editorContentClassName?: string | undefined;
  surfaceOptions?:
    | {
        className?: string | undefined;
        editorContentClassName?: string | undefined;
        style?: React.CSSProperties | undefined;
      }
    | undefined;
}

export function DocumentWysiwygEditor(props: DocumentWysiwygEditorProps): React.JSX.Element {
  const {
    value,
    onChange,
    disabled = false,
    placeholder,
    appearance,
    engineInstance,
    showBrand = false,
    brandClassName,
    brandHref,
    allowFontFamily,
    allowTextAlign,
    enableAdvancedTools,
    allowImage,
    allowTable,
    allowTaskList,
    loadingLabel = 'Loading editor...',
    toolbarClassName,
    surfaceClassName,
    editorContentClassName,
    surfaceOptions,
  } = props;
  const engineProfile = useOptionalTextEditorEngineProfile(engineInstance);
  const resolvedAppearance = appearance ?? engineProfile?.appearance ?? 'default';
  const resolvedAllowFontFamily = allowFontFamily ?? engineProfile?.allowFontFamily ?? false;
  const resolvedAllowTextAlign = allowTextAlign ?? engineProfile?.allowTextAlign ?? false;
  const resolvedEnableAdvancedTools =
    enableAdvancedTools ?? engineProfile?.enableAdvancedTools ?? false;
  const resolvedAllowImage = allowImage ?? engineProfile?.allowImage ?? true;
  const resolvedAllowTable = allowTable ?? engineProfile?.allowTable ?? true;
  const resolvedAllowTaskList = allowTaskList ?? engineProfile?.allowTaskList ?? true;

  const isDocumentPreview = resolvedAppearance === 'document-preview';

  const editor = (
    <RichTextEditor
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      variant='full'
      headingLevels={[1, 2, 3]}
      allowImage={resolvedAllowImage}
      allowTable={resolvedAllowTable}
      allowTaskList={resolvedAllowTaskList}
      allowFontFamily={resolvedAllowFontFamily}
      allowTextAlign={resolvedAllowTextAlign}
      enableAdvancedTools={resolvedEnableAdvancedTools}
      loadingLabel={loadingLabel}
      toolbarClassName={cn('border-slate-300 bg-slate-50', toolbarClassName)}
      surfaceOptions={{
        ...surfaceOptions,
        className: cn(
          isDocumentPreview
            ? 'w-full min-h-[300px] rounded-lg border border-slate-300 bg-white shadow-sm'
            : 'w-full min-h-[250px] rounded-lg border border-slate-300 bg-white',
          surfaceOptions?.className,
          surfaceClassName
        ),
        editorContentClassName: cn(
          isDocumentPreview
            ? '[&_.ProseMirror]:!bg-white [&_.ProseMirror]:!text-slate-900 [&_.ProseMirror]:text-[12pt] [&_.ProseMirror]:leading-[1.5] [&_.ProseMirror]:[font-family:"Times_New_Roman",Georgia,serif] [&_.ProseMirror]:p-8 [&_.ProseMirror]:min-h-[620px] [&_.ProseMirror_blockquote]:!border-l-slate-400 [&_.ProseMirror_code]:!bg-slate-100 [&_.ProseMirror_pre]:!bg-slate-100 [&_.ProseMirror_th]:!bg-slate-100 [&_.ProseMirror_a]:!text-blue-700'
            : '[&_.ProseMirror]:!bg-white [&_.ProseMirror]:!text-slate-900 [&_.ProseMirror_blockquote]:!border-l-slate-300 [&_.ProseMirror_code]:!bg-slate-100 [&_.ProseMirror_pre]:!bg-slate-100 [&_.ProseMirror_th]:!bg-slate-100 [&_.ProseMirror_a]:!text-blue-700',
          surfaceOptions?.editorContentClassName,
          editorContentClassName
        ),
        style: surfaceOptions?.style,
      }}
    />
  );

  if (!showBrand || !engineInstance) {
    return editor;
  }

  return (
    <div className='relative'>
      {editor}
      <TextEditorEngineBrandButton
        instance={engineInstance}
        href={brandHref}
        className={brandClassName}
      />
    </div>
  );
}
