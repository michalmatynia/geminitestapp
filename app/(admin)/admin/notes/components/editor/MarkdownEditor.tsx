"use client";

import React from "react";
import { useToast } from "@/components/ui/toast";
import { renderMarkdownToHtml, autoformatMarkdown } from "../../utils";
import type { NoteFileRecord } from "@/types/notes";

interface MarkdownEditorProps {
  content: string;
  setContent: (content: string) => void;
  showPreview: boolean;
  editorWidth: number | null;
  setEditorWidth: React.Dispatch<React.SetStateAction<number | null>>;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: (isDragging: boolean) => void;
  editorSplitRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  isPasting: boolean;
  contentBackground: string;
  contentTextColor: string;
  previewTypographyStyle: React.CSSProperties;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => Promise<void>;
  setLightboxImage: (imgSrc: string | null) => void;
}

export function MarkdownEditor({
  content,
  setContent,
  showPreview,
  editorWidth,
  setEditorWidth,
  isDraggingSplitter,
  setIsDraggingSplitter,
  editorSplitRef,
  contentRef,
  isPasting,
  contentBackground,
  contentTextColor,
  previewTypographyStyle,
  onPaste,
  setLightboxImage,
}: MarkdownEditorProps) {
  const { toast } = useToast();
  const [debouncedContentHtml, setDebouncedContentHtml] = React.useState<string>("");

  React.useEffect(() => {
    if (!showPreview) return;
    const timer = setTimeout(() => {
      setDebouncedContentHtml(renderMarkdownToHtml(content));
    }, 150); // 150ms debounce
    return () => clearTimeout(timer);
  }, [content, showPreview]);

  React.useEffect(() => {
    if (!showPreview) return;
    const container = editorSplitRef.current;
    if (!container) return;
    setEditorWidth((prev) => prev ?? Math.round(container.getBoundingClientRect().width / 2));
  }, [showPreview, editorSplitRef, setEditorWidth]);

  React.useEffect(() => {
    if (!isDraggingSplitter) return;
    const handlePointerMove = (event: PointerEvent) => {
      const container = editorSplitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const minWidth = 260;
      const maxWidth = rect.width - 260;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, event.clientX - rect.left));
      setEditorWidth(nextWidth);
    };
    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingSplitter, editorSplitRef, setIsDraggingSplitter, setEditorWidth]);

  return (
    <div
      ref={editorSplitRef}
      className={`flex ${showPreview ? "gap-0" : ""}`}
    >
      <div
        className={showPreview ? "flex-shrink-0" : "flex-1"}
        style={showPreview && editorWidth ? { width: editorWidth } : undefined}
      >
        <div className="relative">
          <textarea
            ref={contentRef}
            placeholder="Enter note content (paste images directly!)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={onPaste}
            rows={12}
            className="w-full rounded-lg border border-gray-700 px-4 py-2"
            style={{ backgroundColor: contentBackground, color: contentTextColor }}
            required
          />
          {isPasting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="flex items-center gap-2 text-white">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
                <span className="text-sm">Uploading image...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {showPreview && (
        <>
          <div
            className="mx-3 flex w-3 cursor-col-resize items-stretch"
            onPointerDown={(event) => {
              event.preventDefault();
              setIsDraggingSplitter(true);
            }}
          >
            <div className="relative w-full rounded bg-gray-800/80 ring-1 ring-gray-600/70 hover:bg-gray-700">
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="h-6 w-px bg-gray-500/80" />
              </span>
            </div>
          </div>
          <div
            className="flex-1 rounded-lg border border-gray-700 px-4 py-3"
            style={{ backgroundColor: contentBackground, color: contentTextColor }}
          >
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-400">
              Preview
            </div>
            <div
              className="prose max-w-none [&_img]:cursor-pointer [&_img]:transition-opacity [&_img]:hover:opacity-80"
              style={previewTypographyStyle}
              dangerouslySetInnerHTML={{ __html: debouncedContentHtml }}
              onMouseOver={(e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;
                const wrapper = target.closest("[data-code]");
                const button = wrapper?.querySelector("[data-copy-code]");
                if (button) button.style.opacity = "1";
              }}
              onMouseOut={(e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;
                const wrapper = target.closest("[data-code]");
                const button = wrapper?.querySelector("[data-copy-code]");
                if (button) button.style.opacity = "0";
              }}
              onClick={(e) => {
                const target = e.target;
                if (!(target instanceof HTMLElement)) return;
                const copyButton = target.closest("[data-copy-code]");
                if (copyButton instanceof HTMLButtonElement) {
                  const wrapper = copyButton.closest("[data-code]");
                  const encoded = wrapper?.getAttribute("data-code");
                  if (!encoded) return;
                  const originalLabel = copyButton.textContent;
                  navigator.clipboard
                    .writeText(decodeURIComponent(encoded))
                    .then(() => {
                      copyButton.textContent = "Copied";
                      window.setTimeout(() => {
                        copyButton.textContent = originalLabel ?? "Copy";
                      }, 1500);
                    })
                    .catch(() => toast("Failed to copy code"));
                  return;
                }
                if (target.tagName === "IMG") {
                  const imgSrc = target.src;
                  setLightboxImage(imgSrc);
                }
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
