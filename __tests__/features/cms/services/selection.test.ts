import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { getCmsDataProvider } from "@/features/cms/services/cms-provider";

vi.mock("@/features/cms/services/cms-provider", () => ({
  getCmsDataProvider: vi.fn(),
}));

vi.mock("@/features/cms/services/cms-repository/prisma-cms-repository", () => ({
  prismaCmsRepository: { type: "prisma" },
}));

vi.mock("@/features/cms/services/cms-repository/mongo-cms-repository", () => ({
  mongoCmsRepository: { type: "mongo" },
}));

describe("CMS Repository Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mongo repository when provider is mongodb", async () => {
    (getCmsDataProvider as any).mockResolvedValue("mongodb");
    const repo = await getCmsRepository();
    expect(repo).toEqual({ type: "mongo" });
  });

  it("should return prisma repository when provider is prisma", async () => {
    (getCmsDataProvider as any).mockResolvedValue("prisma");
    const repo = await getCmsRepository();
    expect(repo).toEqual({ type: "prisma" });
  });
});
