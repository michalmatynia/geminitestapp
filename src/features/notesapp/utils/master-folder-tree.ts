import type {
  NoteCategoryRecordWithChildrenDto as CategoryWithChildren,
  NoteDto as NoteRecord,
} from '@/shared/contracts/notes';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const FOLDER_NODE_PREFIX = 'folder:';
const NOTE_NODE_PREFIX = 'note:';

export type NotesMasterNodeRef =
  | { entity: 'folder'; id: string; nodeId: string }
  | { entity: 'note'; id: string; nodeId: string };

export const toFolderMasterNodeId = (folderId: string): string =>
  `${FOLDER_NODE_PREFIX}${folderId}`;

export const toNoteMasterNodeId = (noteId: string): string =>
  `${NOTE_NODE_PREFIX}${noteId}`;

export const isFolderMasterNodeId = (value: string): boolean =>
  value.startsWith(FOLDER_NODE_PREFIX);

export const isNoteMasterNodeId = (value: string): boolean =>
  value.startsWith(NOTE_NODE_PREFIX);

export const fromFolderMasterNodeId = (value: string): string | null =>
  isFolderMasterNodeId(value) ? value.slice(FOLDER_NODE_PREFIX.length) : null;

export const fromNoteMasterNodeId = (value: string): string | null =>
  isNoteMasterNodeId(value) ? value.slice(NOTE_NODE_PREFIX.length) : null;

export const decodeNotesMasterNodeId = (value: string): NotesMasterNodeRef | null => {
  const folderId = fromFolderMasterNodeId(value);
  if (folderId) return { entity: 'folder', id: folderId, nodeId: value };
  const noteId = fromNoteMasterNodeId(value);
  if (noteId) return { entity: 'note', id: noteId, nodeId: value };
  return null;
};

const buildFolderPath = (parentPath: string, folderName: string): string => {
  const normalizedName = folderName.trim();
  if (!parentPath) return normalizedName;
  return `${parentPath}/${normalizedName}`;
};

export const buildMasterNodesFromNotesFolderTree = (
  folders: CategoryWithChildren[]
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];

  const walkFolder = (
    folder: CategoryWithChildren,
    parentFolderNodeId: string | null,
    parentPath: string,
    siblingIndex: number
  ): void => {
    const folderNodeId = toFolderMasterNodeId(folder.id);
    const folderPath = buildFolderPath(parentPath, folder.name);
    nodes.push({
      id: folderNodeId,
      type: 'folder',
      kind: 'folder',
      parentId: parentFolderNodeId,
      name: folder.name,
      path: folderPath,
      sortOrder: siblingIndex,
      metadata: {
        entity: 'folder',
        rawId: folder.id,
      },
    });

    folder.children.forEach((child: CategoryWithChildren, index: number) => {
      walkFolder(child, folderNodeId, folderPath, index);
    });

    const sortedNotes = [...(folder.notes ?? [])].sort((a: NoteRecord, b: NoteRecord) =>
      a.title.localeCompare(b.title)
    );
    sortedNotes.forEach((note: NoteRecord, index: number) => {
      nodes.push({
        id: toNoteMasterNodeId(note.id),
        type: 'file',
        kind: 'note',
        parentId: folderNodeId,
        name: note.title,
        path: buildFolderPath(folderPath, note.title),
        sortOrder: folder.children.length + index,
        metadata: {
          entity: 'note',
          rawId: note.id,
          parentFolderId: folder.id,
        },
      });
    });
  };

  folders.forEach((folder: CategoryWithChildren, index: number) => {
    walkFolder(folder, null, '', index);
  });

  return nodes;
};
