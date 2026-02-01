import { vi, beforeEach, afterAll, describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/notes/notebooks/route";
import { NextRequest } from "next/server";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock noteService
vi.mock("@/features/notesapp/server", () => ({
  noteService: {
    getAllNotebooks: vi.fn().mockResolvedValue([]),
    createNotebook: vi.fn().mockResolvedValue({ id: "nb1", name: "New Notebook" }),
  },
}));

// Mock products server (for parseJsonBody)
vi.mock("@/features/products/server", () => ({
  parseJsonBody: async (req: any, schema: any) => {
    try {
      const body = await req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return { ok: false, response: new Response(JSON.stringify(result.error), { status: 400 }) };
      }
      return { ok: true, data: result.data };
    } catch (e) {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

import { noteService } from "@/features/notesapp/server";

describe("Notes Notebooks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/notes/notebooks", () => {
    it("should return all notebooks", async () => {
      const mockNotebooks = [
        { id: "1", name: "Notebook 1" },
        { id: "2", name: "Notebook 2" },
      ];
      vi.mocked(noteService.getAllNotebooks).mockResolvedValue(mockNotebooks as any);

      const res = await GET(
        new NextRequest("http://localhost/api/notes/notebooks"),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(200);
      expect(data).toHaveLength(2);
      expect(noteService.getAllNotebooks).toHaveBeenCalled();
    });
  });

  describe("POST /api/notes/notebooks", () => {
    it("should create a new notebook", async () => {
      const newNotebook = { name: "My New Notebook", color: "#3b82f6" };
      const res = await POST(
        new NextRequest("http://localhost/api/notes/notebooks", {
          method: "POST",
          body: JSON.stringify(newNotebook),
        }),
        { params: Promise.resolve({}) } as any
      );
      const data = await res.json();
      expect(res.status).toEqual(201);
      expect(data.name).toEqual("New Notebook"); // Based on mock return value
      expect(noteService.createNotebook).toHaveBeenCalledWith(expect.objectContaining({
        name: "My New Notebook"
      }));
    });

    it("should return 400 for invalid data", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/notes/notebooks", {
          method: "POST",
          body: JSON.stringify({}), // missing name
        }),
        { params: Promise.resolve({}) } as any
      );
      expect(res.status).toEqual(400);
    });
  });
});
