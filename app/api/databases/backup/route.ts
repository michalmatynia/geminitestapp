import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const prismaDir = path.join(process.cwd(), "prisma");
    const schema = await fs.readFile(path.join(prismaDir, "schema.prisma"), "utf-8");
    const match = schema.match(/url\s*=\s*"file:(.*)"/);
    let connectedDbPath = match ? path.normalize(match[1]) : null;

    if (connectedDbPath && connectedDbPath.includes("?")) {
      connectedDbPath = connectedDbPath.split("?")[0];
    }

    if (!connectedDbPath) {
      console.error("Could not determine the connected database from schema.prisma.");
      return NextResponse.json(
        { error: "Could not determine the connected database." },
        { status: 500 }
      );
    }

    const dbPath = path.join(prismaDir, path.basename(connectedDbPath));
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