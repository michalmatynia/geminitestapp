import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import { backupsDir, assertValidBackupName } from "../_utils";

export async function POST(req: Request) {
  try {
    const { backupName } = (await req.json()) as { backupName: string };
    if (!backupName) {
      return NextResponse.json({ error: "Backup name is required" }, { status: 400 });
    }

    assertValidBackupName(backupName);

    const backupPath = path.join(backupsDir, backupName);
    await fs.unlink(backupPath);

    return NextResponse.json({ message: "Backup deleted" });
  } catch (error) {
    console.error("Failed to delete backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}
