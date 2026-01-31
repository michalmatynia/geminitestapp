import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatbotJobRepository } from "@/features/chatbot/services/chatbot-job-repository";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { ObjectId } from "mongodb";

// Hoist mocks
const { mockCollection, mockDb } = vi.hoisted(() => {
  const mockCollection = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
    deleteOne: vi.fn(),
  };
  const mockDb = {
    collection: vi.fn(() => mockCollection),
  };
  return { mockCollection, mockDb };
});

vi.mock("@/shared/lib/db/mongo-client", () => ({
  getMongoDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("mongodb", async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockObjectId = vi.fn().mockImplementation((id: string) => ({
    toString: () => id,
    equals: (other: any) => other.toString() === id,
  }));
  (mockObjectId as any).isValid = actual.ObjectId.isValid;
  return {
    ...actual,
    ObjectId: mockObjectId,
  };
});

describe("Chatbot Job Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.find.mockReturnThis();
    mockCollection.sort.mockReturnThis();
    mockCollection.limit.mockReturnThis();
  });

  describe("findAll", () => {
    it("returns jobs with limit", async () => {
      mockCollection.toArray.mockResolvedValue([]);
      await chatbotJobRepository.findAll(10);
      expect(mockCollection.limit).toHaveBeenCalledWith(10);
    });
  });

  describe("findNextPending", () => {
    it("returns the next pending job", async () => {
      const mockJob = {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        sessionId: "s1",
        status: "pending",
        createdAt: new Date(),
      };
      mockCollection.findOne.mockResolvedValue(mockJob);

      const result = await chatbotJobRepository.findNextPending();

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { status: "pending" },
        { sort: { createdAt: 1 } }
      );
      expect(result?.id).toBe("507f1f77bcf86cd799439011");
    });
  });

  describe("create", () => {
    it("creates a new job", async () => {
      const input = {
        sessionId: "s1",
        model: "gpt-4",
        payload: { prompt: "test" },
      };
      const newId = new ObjectId("507f1f77bcf86cd799439012");
      mockCollection.insertOne.mockResolvedValue({ insertedId: newId });

      const result = await chatbotJobRepository.create(input);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result.id).toBe(newId.toString());
      expect(result.status).toBe("pending");
    });
  });

  describe("update", () => {
    it("updates an existing job", async () => {
      const validId = "507f1f77bcf86cd799439011";
      const mockJob = {
        _id: new ObjectId(validId),
        status: "completed",
        resultText: "done",
      };
      mockCollection.findOneAndUpdate.mockResolvedValue(mockJob);

      const result = await chatbotJobRepository.update(validId, { status: "completed", resultText: "done" });

      expect(mockCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(result?.status).toBe("completed");
    });
  });

  describe("deleteMany", () => {
    it("deletes multiple jobs by status", async () => {
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 5 });
      const result = await chatbotJobRepository.deleteMany(["completed", "failed"]);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({ status: { $in: ["completed", "failed"] } });
      expect(result).toBe(5);
    });
  });
});
