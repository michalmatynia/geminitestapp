"use client";

import React, { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Trash2, Edit2, FileText } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations } from "@/types/notes";
import { Button } from "@/components/ui/button";

interface FolderTreeProps {
  folders: CategoryWithChildren[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string) => void;
  onSelectNote: (noteId: string) => void;
  selectedNoteId?: string;
}

interface FolderNodeProps {
  folder: CategoryWithChildren;
  level: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string) => void;
  onSelectNote: (noteId: string) => void;
  selectedNoteId?: string;
}

function FolderNode({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onCreateSubfolder,
  onDelete,
  onRename,
  onSelectNote,
  selectedNoteId,
}: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = folder.children.length > 0;
  const hasNotes = folder.notes && folder.notes.length > 0;
  const isSelected = selectedFolderId === folder.id && !selectedNoteId;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded px-2 py-1.5 cursor-pointer transition ${
          isSelected
            ? "bg-blue-600 text-white"
            : "text-gray-300 hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren || hasNotes ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div
          onClick={() => onSelect(folder.id)}
          className="flex items-center gap-2 flex-1"
        >
          {isExpanded || !hasChildren ? (
            <FolderOpen className="size-4 flex-shrink-0" />
          ) : (
            <Folder className="size-4 flex-shrink-0" />
          )}
          <span className="text-sm truncate">{folder.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Add subfolder"
          >
            <Plus className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename(folder.id);
            }}
            className="p-1 hover:bg-gray-700 rounded"
            title="Rename folder"
          >
            <Edit2 className="size-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.id);
            }}
            className="p-1 hover:bg-red-600 rounded"
            title="Delete folder"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {folder.notes?.map((note) => {
            const isNoteSelected = selectedNoteId === note.id;
            return (
              <div
                key={note.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNote(note.id);
                }}
                className={`group flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer transition ${
                  isNoteSelected
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 28}px` }}
              >
                <FileText className={`size-4 flex-shrink-0 ${isNoteSelected ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`} />
                <span className="text-sm truncate">{note.title}</span>
              </div>
            );
          })}
          {folder.children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onDelete={onDelete}
              onRename={onRename}
              onSelectNote={onSelectNote}
              selectedNoteId={selectedNoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onSelectNote,
  selectedNoteId,
}: FolderTreeProps) {
  return (
    <div className="flex h-full flex-col bg-gray-900 border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Folders</h2>
          <Button
            onClick={() => onCreateFolder(null)}
            size="sm"
            className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <button
          onClick={() => onSelectFolder(null)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${
            selectedFolderId === null && !selectedNoteId
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Folder className="size-4" />
          <span>All Notes</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {folders.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No folders yet
          </div>
        ) : (
          <div className="space-y-0.5">
            {folders.map((folder) => (
              <FolderNode
                key={folder.id}
                folder={folder}
                level={0}
                selectedFolderId={selectedFolderId}
                onSelect={onSelectFolder}
                onCreateSubfolder={onCreateFolder}
                onDelete={onDeleteFolder}
                onRename={onRenameFolder}
                onSelectNote={onSelectNote}
                selectedNoteId={selectedNoteId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
