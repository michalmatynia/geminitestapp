'use client';

import React, { useCallback } from 'react';
import { Clipboard, X } from 'lucide-react';

import { Button, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

// ── Snippet helpers (60×60 viewBox — suitable for panels and inline blocks) ──

export const SVG_SNIPPETS: Record<string, string> = {
  square:
    '<rect x="5" y="5" width="50" height="50" fill="white" stroke="#374151" stroke-width="1.5"/>',
  circle:
    '<circle cx="30" cy="30" r="20" fill="none" stroke="#374151" stroke-width="1.5"/>',
  grid4x4: [
    '<!-- 4×4 dashed grid -->',
    ...[1, 2, 3].flatMap((n) => [
      `<line x1="${n * 15}" y1="0" x2="${n * 15}" y2="60" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>`,
      `<line x1="0" y1="${n * 15}" x2="60" y2="${n * 15}" stroke="#9ca3af" stroke-width="0.7" stroke-dasharray="3,2"/>`,
    ]),
  ].join('\n'),
  diagonal:
    '<line x1="0" y1="0" x2="60" y2="60" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round"/>',
  label:
    '<text x="30" y="55" text-anchor="middle" font-size="11" font-weight="bold" fill="#374151">text</text>',
  cutLine:
    '<path d="M 15,0 L 15,30 L 45,30 L 45,60" fill="none" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

// ── Utilities (exported so callers can reuse them) ────────────────────────────

/** Extract the viewBox attribute value from a raw SVG string. */
export const extractSvgViewBox = (markup: string): string | null => {
  const match = /viewBox="([^"]+)"/.exec(markup);
  return match?.[1] ?? null;
};

/** Returns true when the markup looks like a valid SVG root element. */
export const looksLikeSvg = (markup: string): boolean =>
  /^\s*<svg[\s>]/i.test(markup);

/** Insert a snippet just before the closing </svg> tag, or append if absent. */
export const insertSnippetIntoSvg = (markup: string, snippet: string): string => {
  const closeIdx = markup.lastIndexOf('</svg>');
  if (closeIdx !== -1) {
    return markup.slice(0, closeIdx) + '  ' + snippet + '\n' + markup.slice(closeIdx);
  }
  return markup + '\n' + snippet;
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type SvgPreviewSize = 'sm' | 'md' | 'lg' | 'full';

export type SvgCodeEditorProps = {
  value: string;
  onChange: (next: string) => void;
  /**
   * Called whenever a viewBox attribute is detected in the markup.
   * Use this to sync an external viewBox field without a separate input.
   */
  onViewBoxDetected?: (viewBox: string) => void;
  previewSize?: SvgPreviewSize;
  /** Show snippet helper buttons (default: true). */
  snippets?: boolean;
  placeholder?: string;
  className?: string;
};

// ── Internal height maps ──────────────────────────────────────────────────────

const TEXTAREA_HEIGHT: Record<SvgPreviewSize, string> = {
  sm: 'min-h-[144px]',
  md: 'min-h-[208px]',
  lg: 'min-h-[320px]',
  full: 'min-h-[360px]',
};

const PREVIEW_HEIGHT: Record<SvgPreviewSize, string> = {
  sm: 'h-36',
  md: 'h-52',
  lg: 'h-80',
  full: 'h-full min-h-[360px]',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SvgCodeEditor({
  value,
  onChange,
  onViewBoxDetected,
  previewSize = 'md',
  snippets = true,
  placeholder,
  className,
}: SvgCodeEditorProps): React.JSX.Element {
  const hasContent = value.trim().length > 0;
  const isValid = !hasContent || looksLikeSvg(value);
  const detectedViewBox = hasContent ? extractSvgViewBox(value) : null;

  const handleChange = useCallback(
    (next: string): void => {
      onChange(next);
      if (onViewBoxDetected) {
        const vb = extractSvgViewBox(next);
        if (vb) onViewBoxDetected(vb);
      }
    },
    [onChange, onViewBoxDetected]
  );

  const handleSnippet = useCallback(
    (snippet: string): void => {
      handleChange(insertSnippetIntoSvg(value, snippet));
    },
    [value, handleChange]
  );

  const handlePasteFromClipboard = useCallback(async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      handleChange(text.trim());
    } catch {
      // clipboard unavailable — silent fallback; user can paste manually
    }
  }, [handleChange]);

  const textareaHeight = TEXTAREA_HEIGHT[previewSize];
  const previewHeight = PREVIEW_HEIGHT[previewSize];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Snippet bar */}
      {snippets ? (
        <div className='flex flex-wrap gap-1'>
          {Object.entries(SVG_SNIPPETS).map(([key, snippet]) => (
            <Button
              key={key}
              type='button'
              size='sm'
              variant='outline'
              className='h-6 px-2 text-[10px]'
              onClick={(): void => handleSnippet(snippet)}
            >
              {key}
            </Button>
          ))}
        </div>
      ) : null}

      {/* Split pane: code ← | → preview */}
      <div className='grid gap-3 lg:grid-cols-2'>
        {/* ── Code pane ── */}
        <div className='space-y-1.5'>
          {/* Status / action bar */}
          <div className='flex min-h-[24px] items-center justify-between gap-2'>
            <div className='flex flex-wrap items-center gap-1.5'>
              {hasContent && !isValid ? (
                <span className='rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300'>
                  Not valid SVG
                </span>
              ) : null}
              {detectedViewBox ? (
                <span className='rounded bg-sky-400/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-400'>
                  {detectedViewBox}
                </span>
              ) : null}
            </div>
            <div className='flex shrink-0 items-center gap-0.5'>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='h-6 px-2 text-[10px] text-gray-400 hover:text-gray-200'
                onClick={(): void => {
                  void handlePasteFromClipboard();
                }}
              >
                <Clipboard className='mr-1 size-3' />
                Paste
              </Button>
              {hasContent ? (
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='h-6 px-2 text-[10px] text-rose-400 hover:text-rose-300'
                  onClick={(): void => onChange('')}
                >
                  <X className='mr-1 size-3' />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          <Textarea
            value={value}
            onChange={(e): void => handleChange(e.target.value)}
            placeholder={
              placeholder ??
              '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">\n  <!-- paste or write SVG here -->\n</svg>'
            }
            className={cn('font-mono text-xs', textareaHeight)}
            spellCheck={false}
          />
        </div>

        {/* ── Preview pane ── */}
        <div
          className={cn(
            'flex flex-col overflow-hidden rounded-xl border border-border/40 bg-white',
            previewHeight
          )}
        >
          <div className='flex shrink-0 items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
              Preview
            </span>
            {hasContent && isValid ? (
              <span className='rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600'>
                live
              </span>
            ) : null}
          </div>
          <div className='flex flex-1 items-center justify-center overflow-auto p-3'>
            {hasContent && isValid ? (
              /* admin-only: SVG authored by admin, rendered for instant preview */
              <div
                className='max-h-full max-w-full'
                dangerouslySetInnerHTML={{ __html: value }}
              />
            ) : (
              <p className='text-center text-xs text-gray-300'>
                {hasContent ? '⚠ Invalid SVG' : 'Paste SVG code to preview'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
