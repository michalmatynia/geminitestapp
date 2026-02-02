import { Entity } from './base-types';

export type ImageFileRecord = Entity & {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[];
};

export type ImageFileSelection = Pick<ImageFileRecord, "id" | "filepath">;
