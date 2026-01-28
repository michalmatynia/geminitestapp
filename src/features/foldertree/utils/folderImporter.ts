export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  notes: NoteImport[];
}

export interface NoteImport {
  title: string;
  content: string;
  path: string;
}

/**
 * Parse dropped files and build a folder tree structure
 * Only processes .md and .markdown files as notes
 * Returns a single folder or null for backward compatibility
 */
export async function parseFolderStructure(
  items: DataTransferItemList
): Promise<FolderNode | null> {
  const entries: FileSystemEntry[] = [];

  // Collect all file system entries
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.kind === "file") {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry);
      }
    }
  }

  if (entries.length === 0) {
    return null;
  }

  // Process entries recursively
  const rootEntry = entries[0];
  if (!rootEntry) return null;

  if (rootEntry.isDirectory) {
    return await processDirectoryEntry(
      rootEntry as FileSystemDirectoryEntry,
      ""
    );
  }

  return null;
}

/**
 * Parse multiple dropped folders and build folder tree structures
 * Only processes .md and .markdown files as notes
 * Returns array of folder structures
 */
export async function parseMultipleFolders(
  items: DataTransferItemList
): Promise<FolderNode[]> {
  const entries: FileSystemEntry[] = [];

  // Collect all file system entries
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item && item.kind === "file") {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        entries.push(entry);
      }
    }
  }

  if (entries.length === 0) {
    return [];
  }

  // Process all directory entries
  const folders: FolderNode[] = [];
  for (const entry of entries) {
    if (entry.isDirectory) {
      const folderNode = await processDirectoryEntry(
        entry as FileSystemDirectoryEntry,
        ""
      );
      folders.push(folderNode);
    }
  }

  return folders;
}

async function processDirectoryEntry(
  dirEntry: FileSystemDirectoryEntry,
  parentPath: string
): Promise<FolderNode> {
  const currentPath = parentPath
    ? `${parentPath}/${dirEntry.name}`
    : dirEntry.name;

  const node: FolderNode = {
    name: dirEntry.name,
    path: currentPath,
    children: [],
    notes: [],
  };

  const entries = await readDirectory(dirEntry);

  for (const entry of entries) {
    if (entry.isDirectory) {
      const childNode = await processDirectoryEntry(
        entry as FileSystemDirectoryEntry,
        currentPath
      );
      node.children.push(childNode);
    } else if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      // Only process markdown files
      if (
        fileEntry.name.endsWith(".md") ||
        fileEntry.name.endsWith(".markdown")
      ) {
        const file = await getFile(fileEntry);
        const content = await file.text();
        const title = fileEntry.name.replace(/\.(md|markdown)$/, "");

        node.notes.push({
          title,
          content,
          path: `${currentPath}/${fileEntry.name}`,
        });
      }
    }
  }

  return node;
}

function readDirectory(
  dirEntry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader();
    const entries: FileSystemEntry[] = [];

    const readEntries = () => {
      reader.readEntries(
        (results) => {
          if (results.length === 0) {
            resolve(entries);
          } else {
            entries.push(...results);
            readEntries(); // Continue reading in batches
          }
        },
        (error) => reject(error)
      );
    };

    readEntries();
  });
}

function getFile(fileEntry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    fileEntry.file(
      (file) => resolve(file),
      (error) => reject(error)
    );
  });
}

/**
 * Count total folders and notes in a folder structure
 */
export function countFolderStructure(node: FolderNode): {
  folders: number;
  notes: number;
} {
  let folders = 1; // Count current folder
  let notes = node.notes.length;

  for (const child of node.children) {
    const childCounts = countFolderStructure(child);
    folders += childCounts.folders;
    notes += childCounts.notes;
  }

  return { folders, notes };
}

/**
 * Count total folders and notes across multiple folder structures
 */
export function countMultipleFolders(nodes: FolderNode[]): {
  folders: number;
  notes: number;
} {
  let totalFolders = 0;
  let totalNotes = 0;

  for (const node of nodes) {
    const counts = countFolderStructure(node);
    totalFolders += counts.folders;
    totalNotes += counts.notes;
  }

  return { folders: totalFolders, notes: totalNotes };
}
