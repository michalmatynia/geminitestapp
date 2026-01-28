import fs from "fs/promises";
import path from "path";

import { getImageFileRepository } from "@/features/files/services/image-file-repository";
import { noteService } from "@/features/notesapp";
import type { NoteFileRecord } from "@/shared/types/notes";
import { ErrorSystem } from "@/features/observability";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");
const productsRoot = path.join(uploadsRoot, "products");
const notesRoot = path.join(uploadsRoot, "notes");
const tempFolderName = "temp";

export function getDiskPathFromPublicPath(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

function sanitizeSku(sku: string) {
  return sku.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

function getUploadTarget({
  category,
  sku,
  noteId,
}: {
  category?: "products" | "notes" | undefined;
  sku?: string | null | undefined;
  noteId?: string | null | undefined;
}) {
  if (category === "products") {
    const folderName = sku ? sanitizeSku(sku) : tempFolderName;
    const diskDir = path.join(productsRoot, folderName);
    const publicDir = `/uploads/products/${folderName}`;
    return { diskDir, publicDir };
  }

  if (category === "notes" && noteId) {
    const diskDir = path.join(notesRoot, noteId);
    const publicDir = `/uploads/notes/${noteId}`;
    return { diskDir, publicDir };
  }

  return { diskDir: uploadsRoot, publicDir: "/uploads" };
}

export async function uploadFile(
  file: File,
  options?: { category?: "products" | "notes" | undefined; sku?: string | null | undefined; noteId?: string | null | undefined }
) {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${path.basename(file.name)}`;
  const { diskDir, publicDir } = getUploadTarget({
    category: options?.category,
    sku: options?.sku,
    noteId: options?.noteId,
  });
  const filepath = path.join(diskDir, filename);

  try {
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(filepath, fileBuffer);

    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.createImageFile({
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
    });

    return imageFile;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "fileUploader",
      action: "uploadFile",
      filename,
      diskDir,
    });
    throw error;
  }
}

export async function uploadNoteFile(
  file: File,
  noteId: string,
  slotIndex: number
): Promise<NoteFileRecord> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const filename = `slot-${slotIndex}-${Date.now()}-${path.basename(file.name)}`;
  const diskDir = path.join(notesRoot, noteId);
  const publicDir = `/uploads/notes/${noteId}`;
  const filepath = path.join(diskDir, filename);

  try {
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(filepath, fileBuffer);

    const noteFile = await noteService.createNoteFile({
      noteId,
      slotIndex,
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
    });

    return noteFile;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "fileUploader",
      action: "uploadNoteFile",
      filename,
      noteId,
    });
    throw error;
  }
}

export async function deleteNoteFile(
  noteId: string,
  slotIndex: number,
  filepath: string
): Promise<boolean> {
  try {
    const diskPath = getDiskPathFromPublicPath(filepath);
    await fs.unlink(diskPath).catch(() => {});
    const noteDir = path.join(notesRoot, noteId);
    try {
      const remaining = await fs.readdir(noteDir);
      if (remaining.length === 0) {
        await fs.rmdir(noteDir);
      }
    } catch {
      // ignore cleanup errors
    }
    return await noteService.deleteNoteFile(noteId, slotIndex);
  } catch (error) {
    await ErrorSystem.captureException(error, {
        service: "fileUploader",
        action: "deleteNoteFile",
        noteId,
        filepath
    });
    return false;
  }
}
