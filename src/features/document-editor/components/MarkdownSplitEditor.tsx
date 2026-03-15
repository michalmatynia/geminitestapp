'use client';

import React from 'react';

import { Textarea, LoadingState } from '@/shared/ui';

import { useOptionalMarkdownSplitEditorContext } from '../context/MarkdownSplitEditorContext';
import { useMarkdownPreviewDebounce } from '../hooks/useMarkdownPreviewDebounce';
import { useMarkdownSplitResizer } from '../hooks/useMarkdownSplitResizer';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export interface MarkdownSplitEditorProps {
  value?: string;
  onChange?: (nextValue: string) => void;
  readOnly?: boolean | undefined;
  showPreview?: boolean;
  renderPreviewHtml?: (value: string) => string;
  sanitizePreviewHtml?: ((value: string) => string) | undefined;
  isCodeMode?: boolean | undefined;
  isPasting?: boolean | undefined;
  onPaste?:
    | ((event: React.ClipboardEvent<HTMLTextAreaElement>) => void | Promise<void>)
    | undefined;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null> | undefined;
  splitRef?: React.RefObject<HTMLDivElement | null> | undefined;
  editorWidth?: number | null | undefined;
  onEditorWidthChange?:
    | ((next: number | null | ((prev: number | null) => number | null)) => void)
    | undefined;
  isDraggingSplitter?: boolean | undefined;
  onDraggingSplitterChange?: ((dragging: boolean) => void) | undefined;
  contentBackground?: string | undefined;
  contentTextColor?: string | undefined;
  previewTypographyStyle?: React.CSSProperties | undefined;
  onPreviewImageClick?: ((src: string) => void) | undefined;
  onCopyCodeFailure?: (() => void) | undefined;
  placeholder?: string | undefined;
  debounceMs?: number | undefined;
  textareaClassName?: string | undefined;
}

export function MarkdownSplitEditor(props: MarkdownSplitEditorProps): React.JSX.Element {
  const context = useOptionalMarkdownSplitEditorContext();

  const {
    value = props.value ?? context?.value ?? '',
    onChange = props.onChange ?? context?.onChange ?? ((): void => {}),
    readOnly = props.readOnly ?? context?.readOnly ?? false,
    showPreview = props.showPreview ?? context?.showPreview ?? false,
    renderPreviewHtml = props.renderPreviewHtml ??
      context?.renderPreviewHtml ??
      ((v: string): string => v),
    sanitizePreviewHtml = props.sanitizePreviewHtml ?? context?.sanitizePreviewHtml,
    isPasting = props.isPasting ?? context?.isPasting ?? false,
    onPaste = props.onPaste ?? context?.onPaste,
    textareaRef = props.textareaRef ?? context?.textareaRef,
    splitRef = props.splitRef ?? context?.splitRef,
    editorWidth = props.editorWidth ?? context?.editorWidth ?? null,
    onEditorWidthChange = props.onEditorWidthChange ?? context?.onEditorWidthChange,
    isDraggingSplitter = props.isDraggingSplitter ?? context?.isDraggingSplitter ?? false,
    onDraggingSplitterChange = props.onDraggingSplitterChange ?? context?.onDraggingSplitterChange,
    contentBackground = props.contentBackground ?? context?.contentBackground,
    contentTextColor = props.contentTextColor ?? context?.contentTextColor,
    previewTypographyStyle = props.previewTypographyStyle ?? context?.previewTypographyStyle,
    onPreviewImageClick = props.onPreviewImageClick ?? context?.onPreviewImageClick,
    onCopyCodeFailure = props.onCopyCodeFailure ?? context?.onCopyCodeFailure,
    placeholder = props.placeholder ?? context?.placeholder,
    debounceMs = props.debounceMs ?? context?.debounceMs ?? 150,
    textareaClassName = props.textareaClassName ?? context?.textareaClassName,
  } = props;

  const localSplitRef = React.useRef<HTMLDivElement | null>(null);
  const localTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const previewContentRef = React.useRef<HTMLDivElement | null>(null);

  const finalSplitRef = splitRef ?? localSplitRef;
  const finalTextareaRef = textareaRef ?? localTextareaRef;

  const { isDebouncing, sanitizedPreviewHtml } = useMarkdownPreviewDebounce({
    value,
    renderPreviewHtml,
    sanitizePreviewHtml,
    debounceMs,
    enabled: showPreview,
  });

  const { editorWidth: resolvedEditorWidth, handleMouseDown, updateEditorWidth } =
    useMarkdownSplitResizer({
      splitRef: finalSplitRef,
      editorWidth,
      onEditorWidthChange,
      onDraggingChange: onDraggingSplitterChange,
    });

  const handleCopyCode = React.useCallback(
    async (code: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(code);
      } catch (error) {
        logClientError(error);
        onCopyCodeFailure?.();
      }
    },
    [onCopyCodeFailure]
  );

  const handleSplitterKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const container = finalSplitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const minWidth = 260;
      const maxWidth = rect.width - 260;
      const baseWidth = resolvedEditorWidth ?? Math.round(rect.width / 2);
      const delta = event.key === 'ArrowLeft' ? -24 : 24;
      event.preventDefault();
      updateEditorWidth(Math.min(maxWidth, Math.max(minWidth, baseWidth + delta)));
    },
    [finalSplitRef, resolvedEditorWidth, updateEditorWidth]
  );

  React.useEffect(() => {
    const previewContent = previewContentRef.current;
    if (!previewContent) return;

    const handlePreviewClick = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('button[data-copy-code]')) {
        const code = target.closest('div')?.querySelector('code')?.textContent;
        if (code) void handleCopyCode(code);
        return;
      }
      if (target instanceof HTMLImageElement && target.tagName === 'IMG') {
        onPreviewImageClick?.(target.src);
      }
    };

    previewContent.addEventListener('click', handlePreviewClick);
    return (): void => {
      previewContent.removeEventListener('click', handlePreviewClick);
    };
  }, [handleCopyCode, onPreviewImageClick]);

  return (
    <div
      ref={finalSplitRef}
      className='relative flex min-h-[400px] w-full gap-4 overflow-hidden'
      style={{ background: contentBackground }}
    >
      <div
        className='relative flex flex-col transition-[width] duration-75 ease-out'
        style={{ width: showPreview && resolvedEditorWidth ? `${resolvedEditorWidth}px` : '100%' }}
      >
        <Textarea
          ref={finalTextareaRef}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          onPaste={(event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
            void onPaste?.(event);
          }}
          placeholder={placeholder}
          readOnly={readOnly}
          className={textareaClassName}
          spellCheck={false}
          style={{
            background: contentBackground,
            color: contentTextColor,
          }}
         aria-label={placeholder} title={placeholder}/>
        {isPasting && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]'>
            <LoadingState message='Uploading image…' size='sm' />
          </div>
        )}
      </div>

      {showPreview ? (
        <>
          <button
            type='button'
            className={`group relative z-20 w-1.5 cursor-col-resize rounded-full transition-colors hover:bg-blue-500/50 ${
              isDraggingSplitter ? 'bg-blue-500' : 'bg-border/40'
            }`}
            aria-label='Resize markdown editor panels'
            onMouseDown={handleMouseDown}
            onKeyDown={handleSplitterKeyDown}
          >
            <div className='absolute inset-y-0 -left-2 -right-2' />
          </button>

          <div className='relative flex flex-1 flex-col overflow-hidden rounded-lg border border-border/40 bg-card/20'>
            <div
              ref={previewContentRef}
              className={`prose prose-invert prose-slate max-w-none flex-1 overflow-y-auto p-4 transition-opacity duration-200 ${
                isDebouncing ? 'opacity-50' : 'opacity-100'
              }`}
              style={previewTypographyStyle}
              dangerouslySetInnerHTML={{ __html: sanitizedPreviewHtml }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
