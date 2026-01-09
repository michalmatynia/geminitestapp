import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { resolveDatabasePath } from "@/lib/utils/database-path";

export async function POST() {
  try {
    const prismaDir = path.join(process.cwd(), "prisma");
    const dbPath = resolveDatabasePath();
    const backupDir = path.join(prismaDir, "backups");
    const backupPath = path.join(
      backupDir,
      `${path.parse(dbPath).name}-backup-${Date.now()}.db`
    );

    await fs.copyFile(dbPath, backupPath);
    console.log(`Database backed up to ${backupPath}`);
    return NextResponse.json({ message: "Database backed up successfully" });
  } catch (error) {
    console.error("Failed to back up database:", error);
    return NextResponse.json(
      { error: "Failed to back up database" },
      { status: 500 }
    );
  }
}
