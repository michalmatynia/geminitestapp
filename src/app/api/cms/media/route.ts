import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/features/files/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      throw badRequestError("Invalid form data", { error });
    }

    const files = formData
      .getAll("file")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      throw badRequestError("No file provided");
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw badRequestError("File size exceeds 10MB limit", {
          size: file.size,
          maxSize: MAX_FILE_SIZE,
        });
      }
    }

    const uploads = await Promise.all(files.map((file) => uploadFile(file, { category: "cms" })));
    const payload = uploads.length === 1 ? uploads[0] : uploads;

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.media.POST",
      fallbackMessage: "Failed to upload media",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "cms.media.POST" }
);
