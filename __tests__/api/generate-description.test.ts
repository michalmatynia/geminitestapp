import { NextRequest } from "next/server";
import { POST } from "@/app/api/generate-description/route";
import OpenAI from "openai";

import prisma from "@/lib/prisma";
const createMock = jest.fn();
jest.mock("openai", () => {
  const mockChat = {
    completions: {
      create: createMock,
    },
  };
  return jest.fn().mockImplementation(() => ({
    chat: mockChat,
  }));
});

describe("AI Description Generation API", () => {
  beforeEach(async () => {
    await prisma.setting.deleteMany({});
    (OpenAI as unknown as jest.Mock).mockClear();
    createMock.mockClear();
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
    createMock.mockResolvedValue(mockCompletion);

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
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.description).toBe("This is a test description.");
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
          key: "description_generation_prompt",
          value: "Custom prompt for [name]",
        },
      ],
    });

    const mockCompletion = {
      choices: [{ message: { content: "Custom description" } }],
    };
    createMock.mockResolvedValue(mockCompletion);

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

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: "Custom prompt for Test Product",
          }),
        ]),
      })
    );
  });
});
