"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/shared/ui/button";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
} from "lucide-react";

interface WysiwygEditorProps {
  content: string;
  setContent: (content: string) => void;
  contentBackground: string;
  contentTextColor: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}: ToolbarButtonProps) => (
  <Button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rounded p-1.5 transition-colors ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-gray-800 text-gray-200 hover:bg-gray-700"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
  </Button>
);

const sanitizeContent = (html: string | undefined | null): string => {
  if (!html) return '';
  // Ensure content is a string
  if (typeof html !== 'string') return '';
  // Remove any script tags and potentially dangerous content
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Get safe HTML back
  return temp.innerHTML;
};

export function WysiwygEditor({
  content,
  setContent,
  contentBackground,
  contentTextColor,
}: WysiwygEditorProps) {
  const lastContentRef = useRef(content);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-400 underline hover:text-blue-300",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: sanitizeContent(content),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[200px] focus:outline-none px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML to markdown-like format for storage
      const html = editor.getHTML();
      if (html !== lastContentRef.current) {
        lastContentRef.current = html;
        setContent(html);
      }
    },
  });

  // Update editor content when content prop changes externally
  useEffect(() => {
    if (!editor || content === lastContentRef.current) {
      return;
    }
    const sanitized = sanitizeContent(content);
    if (sanitized !== editor.getHTML()) {
      try {
        lastContentRef.current = content;
        editor.commands.setContent(sanitized, { emitUpdate: false });
      } catch (error) {
        console.error("Failed to set WYSIWYG content:", error);
        // Try to recover by clearing and setting plain text
        try {
          editor.commands.clearContent();
          if (typeof content === 'string' && content.trim()) {
            editor.commands.insertContent(sanitizeContent(content));
          }
        } catch (fallbackError) {
          console.error("Failed to recover from WYSIWYG error:", fallbackError);
        }
      }
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="w-full rounded-lg border border-gray-700 px-4 py-3 min-h-[200px]"
        style={{ backgroundColor: contentBackground, color: contentTextColor }}
      >
        <div className="text-gray-400 text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* WYSIWYG Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="size-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          title="Inline Code"
        >
          <Code className="size-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          title="Task List"
        >
          <CheckSquare className="size-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="size-4" />
        </ToolbarButton>

        <div className="h-6 w-px bg-gray-700 mx-1" />

        {/* Insert elements */}
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive("link")}
          title="Add Link"
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Add Image">
          <ImageIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addTable} title="Insert Table">
          <TableIcon className="size-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content Area */}
      <div
        className="w-full rounded-lg border border-gray-700 min-h-[250px]"
        style={{ backgroundColor: contentBackground, color: contentTextColor }}
      >
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:min-h-[250px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:my-2 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:my-3 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:my-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-600 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_code]:bg-gray-800 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_pre]:bg-gray-800 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-800 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-600 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_hr]:border-gray-600 [&_.ProseMirror_hr]:my-4 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ml-0 [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2 [&_ul[data-type=taskList]_input]:mt-1"
        />
      </div>
    </div>
  );
}
