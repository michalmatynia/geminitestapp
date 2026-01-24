import path from "path";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

import { backupsDir, ensureBackupsDir, assertValidBackupName } from "../_utils";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw badRequestError("No file provided");
    }

    assertValidBackupName(file.name);
    await ensureBackupsDir();

    const backupPath = path.join(backupsDir, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(backupPath, fileBuffer);

    return NextResponse.json({ message: "Backup uploaded" });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "databases/upload.POST",
      fallbackMessage: "Failed to upload backup",
    });
  }
}
