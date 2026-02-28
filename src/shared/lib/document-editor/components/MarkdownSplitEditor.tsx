'use client';

import React from 'react';

import { Textarea, LoadingState } from '@/shared/ui';
import { useMarkdownSplitResizer } from '../hooks/useMarkdownSplitResizer';
import { useMarkdownPreviewDebounce } from '../hooks/useMarkdownPreviewDebounce';

export interface MarkdownSplitEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  readOnly?: boolean | undefined;
  showPreview: boolean;
  renderPreviewHtml: (value: string) => string;
  sanitizePreviewHtml?: ((value: string) => string) | undefined;
  isCodeMode?: boolean | undefined;
  isPasting?: boolean | undefined;
  onPaste?: ((event: React.ClipboardEvent<HTMLTextAreaElement>) => void | Promise<void>) | undefined;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null> | undefined;
  splitRef?: React.RefObject<HTMLDivElement | null> | undefined;
  editorWidth?: number | null | undefined;
  onEditorWidthChange?: ((next: number | null | ((prev: number | null) => number | null)) => void) | undefined;
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
  const {
    value,
    onChange,
    readOnly = false,
    showPreview,
    renderPreviewHtml,
    sanitizePreviewHtml,
    isCodeMode = false,
    isPasting = false,
    onPaste,
    textareaRef,
    splitRef,
    editorWidth = null,
    onEditorWidthChange,
    isDraggingSplitter = false,
    onDraggingSplitterChange,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
    onPreviewImageClick,
    onCopyCodeFailure,
    placeholder,
    debounceMs = 150,
    textareaClassName,
  } = props;

  const localSplitRef = React.useRef<HTMLDivElement | null>(null);
  const localTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  
  const effectiveSplitRef = splitRef ?? localSplitRef;
  const effectiveTextareaRef = textareaRef ?? localTextareaRef;

  const debouncedContentHtml = useMarkdownPreviewDebounce({
    value,
    showPreview,
    renderPreviewHtml,
    sanitizePreviewHtml,
    debounceMs,
  });

  const {
    editorWidth: effectiveEditorWidth,
    updateDragging,
  } = useMarkdownSplitResizer({
    splitRef: effectiveSplitRef,
    editorWidth,
    onEditorWidthChange,
    isDraggingSplitter,
    onDraggingSplitterChange,
    showPreview,
  });

  return (
    <div ref={effectiveSplitRef} className={`flex ${showPreview ? 'gap-0' : ''}`}>
      <div
        className={showPreview ? 'flex-shrink-0' : 'flex-1'}
        style={showPreview && effectiveEditorWidth ? { width: effectiveEditorWidth } : undefined}
      >
        <div className='relative'>
          <Textarea
            ref={effectiveTextareaRef}
            placeholder={
              placeholder ||
              (isCodeMode
                ? 'Enter code snippets using ```language blocks (e.g., ```javascript)'
                : 'Enter document content')
            }
            value={value}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              if (readOnly) return;
              onChange(event.target.value);
            }}
            onPaste={(event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
              if (readOnly) {
                event.preventDefault();
                return;
              }
              if (!onPaste) return;
              void onPaste(event);
            }}
            readOnly={readOnly}
            rows={12}
            className={textareaClassName || 'w-full rounded-lg border px-4 py-2 font-mono'}
            style={{
              backgroundColor: contentBackground,
              color: contentTextColor,
              ...(isCodeMode
                ? {
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                }
                : {}),
            }}
            required
          />
          {isPasting ? (
            <LoadingState message='Uploading image...' className='absolute inset-0 bg-black/50' />
          ) : null}
        </div>
      </div>

      {showPreview ? (
        <>
          <div
            className='mx-3 flex w-3 cursor-col-resize items-stretch'
            onPointerDown={(event: React.PointerEvent): void => {
              if (readOnly) return;
              event.preventDefault();
              updateDragging(true);
            }}
          >
            <div className='relative w-full rounded bg-gray-800/80 ring-1 ring-gray-600/70 hover:bg-gray-700'>
              <span className='pointer-events-none absolute inset-0 flex items-center justify-center'>
                <span className='h-6 w-px bg-gray-500/80' />
              </span>
            </div>
          </div>

          <div
            className='flex-1 rounded-lg border px-4 py-3'
            style={{ backgroundColor: contentBackground, color: contentTextColor }}
          >
            <div className='mb-2 text-xs uppercase tracking-wide text-gray-400'>
              {isCodeMode ? 'Code Preview' : 'Preview'}
            </div>
            <div
              className='prose max-w-none [&_img]:cursor-pointer [&_img]:transition-opacity [&_img]:hover:opacity-80'
              style={previewTypographyStyle}
              dangerouslySetInnerHTML={{ __html: debouncedContentHtml }}
              onMouseOver={(event: React.MouseEvent): void => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const wrapper = target.closest('[data-code]');
                const button = wrapper?.querySelector('[data-copy-code]');
                if (button instanceof HTMLElement) button.style.opacity = '1';
              }}
              onMouseOut={(event: React.MouseEvent): void => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;
                const wrapper = target.closest('[data-code]');
                const button = wrapper?.querySelector('[data-copy-code]');
                if (button instanceof HTMLElement) button.style.opacity = '0';
              }}
              onClick={(event: React.MouseEvent): void => {
                const target = event.target;
                if (!(target instanceof HTMLElement)) return;

                const copyButton = target.closest('[data-copy-code]');
                if (copyButton instanceof HTMLButtonElement) {
                  const wrapper = copyButton.closest('[data-code]');
                  const encoded = wrapper?.getAttribute('data-code');
                  if (!encoded) return;
                  const originalLabel = copyButton.textContent;
                  navigator.clipboard
                    .writeText(decodeURIComponent(encoded))
                    .then((): void => {
                      copyButton.textContent = 'Copied';
                      window.setTimeout((): void => {
                        copyButton.textContent = originalLabel ?? 'Copy';
                      }, 1500);
                    })
                    .catch((): void => {
                      onCopyCodeFailure?.();
                    });
                  return;
                }

                if (target instanceof HTMLImageElement && target.tagName === 'IMG') {
                  onPreviewImageClick?.(target.src);
                }
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
