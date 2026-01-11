import { POST as POST_BACKUP } from "@/app/api/databases/backup/route";
import { POST as POST_RESTORE } from "@/app/api/databases/restore/route";
import { GET as GET_BACKUPS } from "@/app/api/databases/backups/route";
import { POST as POST_UPLOAD } from "@/app/api/databases/upload/route";
import { POST as POST_DELETE } from "@/app/api/databases/delete/route";
import fs from "fs/promises";
import { execFile } from "child_process";

jest.mock("child_process", () => ({
  ...jest.requireActual("child_process"),
  execFile: jest.fn(),
}));

describe("Databases API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (execFile as jest.Mock).mockImplementation(
      (command, args, callback) => {
        callback(null, "stdout", "stderr");
      }
    );
  });

  describe("POST /api/databases/backup", () => {
    it("should create a backup of the database", async () => {
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);

      const res = await POST_BACKUP(
        new Request("http://localhost/api/databases/backup", { method: "POST" })
      );
      expect(res.status).toEqual(200);
      expect(execFile).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/databases/restore", () => {
    it("should restore a database from a backup", async () => {
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
      jest.spyOn(fs, "readFile").mockResolvedValueOnce("{}");

      const res = await POST_RESTORE(
        new Request("http://localhost/api/databases/restore", {
          method: "POST",
          body: JSON.stringify({
            backupName: "test-backup.dump",
          }),
        })
      );
      expect(res.status).toEqual(200);
      expect(execFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe("GET /api/databases/backups", () => {
    it("should return a list of backups", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          "stardb-backup-123.dump",
          "restore-log.json",
        ] as any);
      jest.spyOn(fs, "readFile").mockResolvedValue("{}");
      jest.spyOn(fs, "stat").mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      } as any);

      const res = await GET_BACKUPS(
        new Request("http://localhost/api/databases/backups")
      );
      const backups = await res.json();
      expect(res.status).toEqual(200);
      expect(backups.length).toEqual(1);
      expect(backups[0].name).toEqual("stardb-backup-123.dump");
    });
  });

  describe("POST /api/databases/upload", () => {
    it("should upload a database backup file", async () => {
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
      const formData = new FormData();
      const blob = new Blob(["test content"]);
      formData.append("file", blob, "test.dump");

      const res = await POST_UPLOAD(
        new Request("http://localhost/api/databases/upload", {
          method: "POST",
          body: formData,
        })
      );
      expect(res.status).toEqual(200);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });

    it("should reject an invalid file type", async () => {
      const formData = new FormData();
      const blob = new Blob(["test content"], { type: "text/plain" });
      formData.append("file", blob, "test.txt");

      const res = await POST_UPLOAD(
        new Request("http://localhost/api/databases/upload", {
          method: "POST",
          body: formData,
        })
      );
      expect(res.status).toEqual(500);
    });
  });

  describe("POST /api/databases/delete", () => {
    it("should delete a database backup file", async () => {
      jest.spyOn(fs, "unlink").mockResolvedValue(undefined);

      const res = await POST_DELETE(
        new Request("http://localhost/api/databases/delete", {
          method: "POST",
          body: JSON.stringify({ backupName: "test.dump" }),
        })
      );
      expect(res.status).toEqual(200);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
    });
  });
});
