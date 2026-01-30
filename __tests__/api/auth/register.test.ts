import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import prisma from "@/shared/lib/db/prisma";

// Mock the entire server module WITHOUT calling importOriginal
vi.mock("@/features/auth/server", () => ({
  getAuthDataProvider: vi.fn().mockResolvedValue("prisma"),
  getAuthUserPageSettings: vi.fn().mockResolvedValue({
    allowSignup: true,
    requireEmailVerification: false,
  }),
  getAuthSecurityPolicy: vi.fn().mockResolvedValue({}),
  validatePasswordStrength: vi.fn().mockReturnValue({ ok: true, errors: [] }),
  normalizeAuthEmail: (email: string) => email.toLowerCase().trim(),
}));

// Mock prisma
vi.mock("@/shared/lib/db/prisma", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcryptjs to avoid real hashing in tests
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed_password"),
}));

// Mock other dependencies used by the route or apiHandler
vi.mock("@/shared/lib/api/api-handler", () => ({
  apiHandler: (handler: any) => handler,
}));

describe("Auth Register API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://...";
  });

  it("registers a new user successfully with Prisma", async () => {
    const authServer = await import("@/features/auth/server");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      email: "new@example.com",
      name: "New User",
    } as any);

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "NEW@example.com ",
        password: "password123",
        name: "New User",
      }),
    });

    const res = await POST(req, {} as any);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.email).toBe("new@example.com");
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it("returns 409 if user already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "existing" } as any);

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "existing@example.com",
        password: "password123",
      }),
    });

    const res = await POST(req, {} as any);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("already exists");
  });
});