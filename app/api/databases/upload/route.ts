import path from "path";
import fs from "fs/promises";
import { NextResponse } from "next/server";

import { backupsDir, ensureBackupsDir, assertValidBackupName } from "../_utils";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    assertValidBackupName(file.name);
    await ensureBackupsDir();

    const backupPath = path.join(backupsDir, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(backupPath, fileBuffer);

    return NextResponse.json({ message: "Backup uploaded" });
  } catch (error) {
    console.error("Failed to upload backup:", error);
    return NextResponse.json(
      { error: "Failed to upload backup" },
      { status: 500 }
    );
  }
}
