import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const backupsDir = path.join(process.cwd(), "prisma", "backups");

export async function POST(req: Request) {
  try {
    const { dbName } = await req.json() as { dbName: string };
    const backupPath = path.join(backupsDir, dbName);

    // Basic security check to prevent path traversal
    if (path.dirname(backupPath) !== backupsDir) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 });
    }

    await fs.unlink(backupPath);
    console.log(`Database backup deleted: ${backupPath}`);
    return NextResponse.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { message: "Failed to delete backup" },
      { status: 500 }
    );
  }
}
