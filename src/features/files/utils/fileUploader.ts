import "server-only";

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { getImageFileRepository } from "@/features/files/services/image-file-repository";
import { noteService } from "@/features/notesapp/server";
import type { NoteFileRecord } from "@/shared/types/notes";
import { ErrorSystem } from "@/features/observability/server";

import type { ImageFileRecord } from "@/features/files/types/services/image-file-repository";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");
const productsRoot = path.join(uploadsRoot, "products");
const notesRoot = path.join(uploadsRoot, "notes");
const studioRoot = path.join(uploadsRoot, "studio");
const tempFolderName = "temp";

export function getDiskPathFromPublicPath(publicPath: string): string {
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

function sanitizeSku(sku: string): string {
  return sku.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

function sanitizeFolderPath(value: string): string {
  const normalized = value.replace(/\\/g, "/").trim();
  const parts = normalized
    .split("/")
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== "." && part !== "..")
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, "_"))
    .filter(Boolean);

  return parts.join("/");
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^_+/, "");
  return sanitized || "upload.bin";
}

function getUploadTarget({
  category,
  sku,
  noteId,
  projectId,
  folder,
}: {
  category?: "products" | "notes" | "cms" | "studio" | undefined;
  sku?: string | null | undefined;
  noteId?: string | null | undefined;
  projectId?: string | null | undefined;
  folder?: string | null | undefined;
}): { diskDir: string; publicDir: string } {
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

  if (category === "cms") {
    const diskDir = path.join(uploadsRoot, "cms");
    const publicDir = `/uploads/cms`;
    return { diskDir, publicDir };
  }

  if (category === "studio") {
    if (!projectId) {
      throw new Error("projectId is required for studio uploads.");
    }
    const safeProject = sanitizeSegment(projectId);
    const safeFolder = folder && folder.trim() ? sanitizeFolderPath(folder) : "";
    const diskDir = safeFolder
      ? path.join(studioRoot, safeProject, safeFolder)
      : path.join(studioRoot, safeProject);
    const publicDir = safeFolder
      ? `/uploads/studio/${safeProject}/${safeFolder}`
      : `/uploads/studio/${safeProject}`;
    return { diskDir, publicDir };
  }

  return { diskDir: uploadsRoot, publicDir: "/uploads" };
}

export async function uploadFile(
  file: File,
  options?: {
    category?: "products" | "notes" | "cms" | "studio" | undefined;
    sku?: string | null | undefined;
    noteId?: string | null | undefined;
    projectId?: string | null | undefined;
    folder?: string | null | undefined;
    allowOrphanRecord?: boolean | undefined;
    filenameOverride?: string | null | undefined;
  }
): Promise<ImageFileRecord> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const rawName =
    options?.filenameOverride && options.filenameOverride.trim().length > 0
      ? options.filenameOverride
      : typeof file.name === "string" && file.name.trim().length > 0
      ? file.name
      : "upload.bin";
  const filename = `${Date.now()}-${sanitizeFilename(rawName)}`;
  const { diskDir, publicDir } = getUploadTarget({
    category: options?.category,
    sku: options?.sku,
    noteId: options?.noteId,
    projectId: options?.projectId,
    folder: options?.folder,
  });
  const filepath = path.join(diskDir, filename);

  try {
    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(filepath, fileBuffer);

    const imageFileRepository = await getImageFileRepository();
    const recordInput = {
      filename,
      filepath: `${publicDir}/${filename}`,
      mimetype: file.type,
      size: file.size,
    };
    const imageFile = await imageFileRepository.createImageFile(recordInput);

    return imageFile;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "fileUploader",
      action: "uploadFile",
      filename,
      diskDir,
    });
    if (options?.allowOrphanRecord) {
      const now = new Date();
      return {
        id: randomUUID(),
        filename,
        filepath: `${publicDir}/${filename}`,
        mimetype: file.type,
        size: file.size,
        width: null,
        height: null,
        tags: [],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }
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
