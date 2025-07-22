import { POST as POST_BACKUP } from "@/app/api/databases/backup/route";
import { POST as POST_RESTORE } from "@/app/api/databases/restore/route";
import { GET as GET_BACKUPS } from "@/app/api/databases/backups/route";
import fs from "fs/promises";

describe("Databases API", () => {
  let readFileSpy: jest.SpyInstance;
  let copyFileSpy: jest.SpyInstance;
  let writeFileSpy: jest.SpyInstance;
  let readdirSpy: jest.SpyInstance;
  let statSpy: jest.SpyInstance;

  beforeEach(() => {
    readFileSpy = jest.spyOn(fs, "readFile");
    copyFileSpy = jest.spyOn(fs, "copyFile");
    writeFileSpy = jest.spyOn(fs, "writeFile");
    readdirSpy = jest.spyOn(fs, "readdir");
    statSpy = jest.spyOn(fs, "stat");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("POST /api/databases/backup", () => {
    it("should create a backup of the database", async () => {
      readFileSpy.mockResolvedValue('url = "file:./dev.db"');
      copyFileSpy.mockResolvedValue(undefined);

      const res = await POST_BACKUP(
        new Request("http://localhost/api/databases/backup", { method: "POST" })
      );
      expect(res.status).toEqual(200);
      expect(copyFileSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /api/databases/restore", () => {
    it("should restore a database from a backup", async () => {
      readFileSpy.mockResolvedValueOnce('url = "file:./dev.db"');
      readFileSpy.mockResolvedValueOnce("{}");
      copyFileSpy.mockResolvedValue(undefined);
      writeFileSpy.mockResolvedValue(undefined);

      const res = await POST_RESTORE(
        new Request("http://localhost/api/databases/restore", {
          method: "POST",
          body: JSON.stringify({
            dbName: "dev-backup.db",
          }),
        })
      );
      expect(res.status).toEqual(200);
      expect(copyFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/databases/backups", () => {
    it("should return a list of backups", async () => {
      readdirSpy.mockResolvedValue(["dev-backup.db", "restore-log.json"] as any);
      readFileSpy.mockResolvedValue("{}");
      statSpy.mockResolvedValue({
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
      expect(backups[0].name).toEqual("dev-backup.db");
    });
  });
});