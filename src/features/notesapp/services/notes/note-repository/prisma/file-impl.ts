import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/shared/lib/db/prisma';
import type { NoteFileDto as NoteFileRecord, CreateNoteFileDto as NoteFileCreateInput } from '@/shared/contracts/notes';

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
  const file = await prisma.noteFile.create({
    data: createData,
  });
  return {
    ...file,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
};

export const getNoteFiles = async (
  noteId: string
): Promise<NoteFileRecord[]> => {
  const files = await prisma.noteFile.findMany({
    where: { noteId },
    orderBy: { slotIndex: 'asc' },
  });
  return files.map(file => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  }));
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
