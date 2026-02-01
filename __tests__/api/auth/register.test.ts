import { vi, beforeEach, afterAll, describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";

// Mock the api-handler module
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

const { mockCollection } = vi.hoisted(() => ({
  mockCollection: {
    findOne: vi.fn(),
    insertOne: vi.fn().mockResolvedValue({ insertedId: "user-id" }),
  }
}));

vi.mock("@/shared/lib/db/mongo-client", () => ({
  getMongoDb: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue(mockCollection),
  }),
}));

// Mock auth server functions
vi.mock("@/features/auth/server", () => ({
  normalizeAuthEmail: (email: string) => email.toLowerCase(),
  getAuthSecurityPolicy: vi.fn().mockResolvedValue({}),
  validatePasswordStrength: vi.fn().mockReturnValue({ ok: true }),
  getAuthUserPageSettings: vi.fn().mockResolvedValue({ allowSignup: true }),
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
    } catch {
      return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
    }
  },
}));

import { getAuthUserPageSettings, validatePasswordStrength } from "@/features/auth/server";

describe("Auth Register API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = "mongodb://mock";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.MONGODB_URI;
  });

  it("should successfully register a new user", async () => {
    mockCollection.findOne.mockResolvedValue(null);

    const payload = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const res = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    const data = await res.json();
    expect(res.status).toEqual(201);
    expect(data.id).toEqual("user-id");
    expect(data.email).toEqual("test@example.com");
  });

  it("should return 409 if user already exists", async () => {
    mockCollection.findOne.mockResolvedValue({ email: "existing@example.com" });

    const payload = {
      email: "existing@example.com",
      password: "password123",
    };

    const res = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(409);
  });

  it("should return 403 if registration is disabled", async () => {
    vi.mocked(getAuthUserPageSettings).mockResolvedValue({ allowSignup: false } as any);

    const payload = {
      email: "test@example.com",
      password: "password123",
    };

    const res = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(403);
  });

  it("should return 400 if password does not meet policy", async () => {
    vi.mocked(validatePasswordStrength).mockReturnValue({ ok: false, errors: ["Too short"] } as any);

    const payload = {
      email: "test@example.com",
      password: "123",
    };

    const res = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toEqual(400);
  });
});