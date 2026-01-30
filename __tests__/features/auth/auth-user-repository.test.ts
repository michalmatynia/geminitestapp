import { describe, it, expect, vi, beforeEach } from "vitest";
import { findAuthUserByEmail, findAuthUserById } from "@/features/auth/services/auth-user-repository";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getAuthDataProvider } from "@/features/auth/services/auth-provider";

vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/shared/lib/db/mongo-client", () => ({
  getMongoDb: vi.fn(),
}));

vi.mock("@/features/auth/services/auth-provider", () => ({
  getAuthDataProvider: vi.fn(),
}));

describe("Auth User Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://...";
    process.env.MONGODB_URI = "mongodb://...";
  });

  describe("findAuthUserByEmail", () => {
    it("finds user via Prisma when provider is prisma", async () => {
      vi.mocked(getAuthDataProvider).mockResolvedValue("prisma");
      const mockUser = {
        id: "u1",
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed",
        image: null,
        emailVerified: null,
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await findAuthUserByEmail("TEST@example.com "); // Testing normalization
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        select: expect.anything(),
      });
      expect(result).toEqual(mockUser);
    });

    it("finds user via MongoDB when provider is mongodb", async () => {
      vi.mocked(getAuthDataProvider).mockResolvedValue("mongodb");
      const mockUser = {
        _id: { toString: () => "u1" },
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed",
        image: null,
        emailVerified: null,
      };
      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(mockUser),
      };
      const mockDb = {
        collection: vi.fn().mockReturnValue(mockCollection),
      };
      vi.mocked(getMongoDb).mockResolvedValue(mockDb as any);

      const result = await findAuthUserByEmail("test@example.com");

      expect(mockDb.collection).toHaveBeenCalledWith("users");
      expect(mockCollection.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(result?.id).toBe("u1");
      expect(result?.email).toBe("test@example.com");
    });

    it("returns null if user not found", async () => {
      vi.mocked(getAuthDataProvider).mockResolvedValue("prisma");
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await findAuthUserByEmail("unknown@example.com");
      expect(result).toBeNull();
    });
  });

  describe("findAuthUserById", () => {
    it("finds user via Prisma", async () => {
      vi.mocked(getAuthDataProvider).mockResolvedValue("prisma");
      const mockUser = {
        id: "u1",
        email: "test@example.com",
        name: "Test User",
      };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await findAuthUserById("u1");
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: expect.anything(),
      });
      expect(result?.id).toBe("u1");
    });
  });
});
