import prisma from "@/shared/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { NoteFileRecord, NoteFileCreateInput } from "@/shared/types/notes";

export const createNoteFile = async (
  data: NoteFileCreateInput
): Promise<NoteFileRecord> => {
  const createData: Prisma.NoteFileCreateInput = {
    note: { connect: { id: data.noteId } },
    slotIndex: data.slotIndex,
    filename: data.filename,
    filepath: data.filepath,
    mimetype: data.mimetype,
    size: data.size,
    ...(data.width !== undefined && { width: data.width }),
    ...(data.height !== undefined && { height: data.height }),
  };
  return prisma.noteFile.create({
    data: createData,
  });
};

export const getNoteFiles = async (
  noteId: string
): Promise<NoteFileRecord[]> => {
  return prisma.noteFile.findMany({
    where: { noteId },
    orderBy: { slotIndex: "asc" },
  });
};

export const deleteNoteFile = async (
  noteId: string,
  slotIndex: number
): Promise<boolean> => {
  try {
    await prisma.noteFile.delete({
      where: {
        noteId_slotIndex: { noteId, slotIndex },
      },
    });
    return true;
  } catch {
    return false;
  }
};
