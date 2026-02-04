import { describe, it, expect, beforeEach } from "vitest";
import { 
  createDraft, 
  getDraft, 
  listDrafts, 
  updateDraft, 
  deleteDraft 
} from "@/features/drafter/services/draft-repository";
import prisma from "@/shared/lib/db/prisma";

describe("DraftRepository (Prisma)", () => {
  beforeEach(async () => {
    // Cleanup
    await prisma.productDraft.deleteMany();
  });

  it("should create and retrieve a draft", async () => {
    const input = {
      name: "Test Draft",
      description: "Test Description",
      price: 1000,
      active: true,
    };

    const created = await createDraft(input);
    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Draft");

    const retrieved = await getDraft(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Test Draft");
    expect(retrieved?.price).toBe(1000);
  });

  it("should list all drafts ordered by createdAt desc", async () => {
    await createDraft({ name: "Draft 1" });
    await new Promise(r => setTimeout(r, 100)); // Ensure different timestamps
    await createDraft({ name: "Draft 2" });

    const drafts = await listDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts[0]!.name).toBe("Draft 2");
    expect(drafts[1]!.name).toBe("Draft 1");
  });

  it("should update a draft", async () => {
    const draft = await createDraft({ name: "Original Name" });
    
    const updated = await updateDraft(draft.id, { name: "Updated Name", price: 2000 });
    expect(updated?.name).toBe("Updated Name");
    expect(updated?.price).toBe(2000);

    const retrieved = await getDraft(draft.id);
    expect(retrieved?.name).toBe("Updated Name");
  });

  it("should delete a draft", async () => {
    const draft = await createDraft({ name: "To Delete" });
    
    const result = await deleteDraft(draft.id);
    expect(result).toBe(true);

    const retrieved = await getDraft(draft.id);
    expect(retrieved).toBeNull();
  });

  it("should return null when getting non-existent draft", async () => {
    const retrieved = await getDraft("non-existent");
    expect(retrieved).toBeNull();
  });

  it("should handle array fields like catalogIds correctly", async () => {
    const input = {
      name: "Draft with Arrays",
      catalogIds: ["cat1", "cat2"],
      categoryId: "tag1",
    };

    const created = await createDraft(input);
    expect(created.catalogIds).toEqual(["cat1", "cat2"]);
    expect(created.categoryId).toBe("tag1");

    const updated = await updateDraft(created.id, { catalogIds: ["cat3"] });
    expect(updated?.catalogIds).toEqual(["cat3"]);
  });
});
