import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const backupsDir = path.join(process.cwd(), "prisma", "backups");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (path.extname(file.name) !== ".db") {
      return NextResponse.json({ message: "Invalid file type" }, { status: 400 });
    }

    const backupPath = path.join(backupsDir, file.name);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(backupPath, fileBuffer);

    console.log(`Database backup uploaded: ${backupPath}`);
    return NextResponse.json({ message: "Backup uploaded successfully" });
  } catch (error) {
    console.error("Error uploading backup:", error);
    return NextResponse.json(
      { message: "Failed to upload backup" },
      { status: 500 }
    );
  }
}
