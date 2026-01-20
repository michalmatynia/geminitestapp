import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";

import {
  backupsDir as pgBackupsDir,
  assertValidBackupName as assertValidPgBackupName,
} from "../_utils";
import {
  backupsDir as mongoBackupsDir,
  assertValidBackupName as assertValidMongoBackupName,
} from "../_utils-mongo";

export async function POST(req: Request) {
  try {
    const { backupName, type } = (await req.json()) as {
      backupName: string;
      type?: "postgresql" | "mongodb";
    };
    if (!backupName) {
      return NextResponse.json({ error: "Backup name is required" }, { status: 400 });
    }

    const dbType = type === "mongodb" ? "mongodb" : "postgresql";
    if (dbType === "mongodb") {
      assertValidMongoBackupName(backupName);
    } else {
      assertValidPgBackupName(backupName);
    }

    const backupsDir = dbType === "mongodb" ? mongoBackupsDir : pgBackupsDir;
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
