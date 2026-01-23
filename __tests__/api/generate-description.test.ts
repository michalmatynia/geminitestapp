/**
 * @vitest-environment node
 */

import { vi, Mock } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/generate-description/route";
import OpenAI from "openai";

import prisma from "@/lib/prisma";

const { mockCreate } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
  };
});

vi.mock("openai", () => {
  const mockChat = {
    completions: {
      create: mockCreate,
    },
  };
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: mockChat,
    })),
  };
});

describe("AI Description Generation API", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "" };
    await prisma.setting.deleteMany({});
    (OpenAI as unknown as Mock).mockClear();
    mockCreate.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return a generated description", async () => {
    await prisma.setting.create({
      data: { key: "openai_api_key", value: "test-api-key" },
    });

    const mockCompletion = {
      choices: [{ message: { content: "This is a test description." } }],
    };
    mockCreate.mockResolvedValue(mockCompletion);

    const req = new NextRequest(
      "http://localhost/api/generate-description",
      {
        method: "POST",
        body: JSON.stringify({
          productData: { name_en: "Test Product" },
          imageUrls: [],
        }),
      }
    );

    const res = await POST(req);
    const data = (await res.json()) as { description: string };

    expect(res.status).toBe(200);
    expect(data.description).toBe("This is a test description.");
    // Called once for vision, once for generation
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("should fail if product name is missing", async () => {
    const req = new NextRequest(
      "http://localhost/api/generate-description",
      {
        method: "POST",
        body: JSON.stringify({ productData: {}, imageUrls: [] }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should fail if API key is not configured", async () => {
    // Both setting and env are empty
    // Force OpenAI models so it checks for API key
    await prisma.setting.createMany({
      data: [
        { key: "ai_vision_model", value: "gpt-4o" },
        { key: "openai_model", value: "gpt-3.5-turbo" },
      ],
    });

    const req = new NextRequest(
      "http://localhost/api/generate-description",
      {
        method: "POST",
        body: JSON.stringify({
          productData: { name_en: "Test Product" },
          imageUrls: [],
        }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("should use the custom prompt from settings", async () => {
    await prisma.setting.createMany({
      data: [
        { key: "openai_api_key", value: "test-api-key" },
        {
          key: "openai_model",
          value: "gpt-3.5-turbo",
        },
        {
          key: "description_generation_user_prompt",
          value: "Custom prompt for [name_en]",
        },
      ],
    });

    const mockCompletion = {
      choices: [{ message: { content: "Custom description" } }],
    };
    mockCreate.mockResolvedValue(mockCompletion);

    const req = new NextRequest(
      "http://localhost/api/generate-description",
      {
        method: "POST",
        body: JSON.stringify({
          productData: { name_en: "Test Product" },
          imageUrls: [],
        }),
      }
    );

    await POST(req);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-3.5-turbo",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            content: expect.arrayContaining([
              expect.objectContaining({
                text: "Custom prompt for Test Product",
              }),
            ]),
          }),
        ]),
      })
    );
  });
});
