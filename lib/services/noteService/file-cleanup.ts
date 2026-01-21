import fs from "fs/promises";
import path from "path";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");
const notesRoot = path.join(uploadsRoot, "notes");

export function getDiskPathFromPublicPath(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

export async function cleanupNoteFile(noteId: string, filepath: string) {
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
  } catch {
    // ignore
  }
}
