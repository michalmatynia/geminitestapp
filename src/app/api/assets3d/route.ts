import { NextRequest, NextResponse } from "next/server";
import { getAsset3DRepository, uploadAsset3D, validate3DFile } from "@/features/viewer3d/server";
import { apiHandler, getQueryParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { badRequestError } from "@/shared/errors/app-error";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

async function GET_handler(req: NextRequest): Promise<Response> {
  const searchParams = getQueryParams(req);
  const filename = searchParams.get("filename");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const isPublicStr = searchParams.get("isPublic");
  const tagsStr = searchParams.get("tags");

  const repository = getAsset3DRepository();
  const assets = await repository.listAssets3D({
    ...(filename && { filename }),
    ...(category && { category }),
    ...(search && { search }),
    ...(isPublicStr && { isPublic: isPublicStr === "true" }),
    ...(tagsStr && { tags: tagsStr.split(",").filter(Boolean) }),
  });

  return NextResponse.json(assets);
}

async function POST_handler(req: NextRequest): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw badRequestError("Invalid form data");
  }

  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const description = formData.get("description") as string | null;
  const category = formData.get("category") as string | null;
  const tagsStr = formData.get("tags") as string | null;
  const isPublicStr = formData.get("isPublic") as string | null;

  if (!file) {
    throw badRequestError("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw badRequestError("File size exceeds 100MB limit", {
      size: file.size,
      maxSize: MAX_FILE_SIZE,
    });
  }

  const validation = validate3DFile(file);
  if (!validation.valid) {
    throw badRequestError(validation.error ?? "Invalid file type");
  }

  const asset = await uploadAsset3D(file, {
    ...(name && { name }),
    ...(description && { description }),
    ...(category && { category }),
    ...(tagsStr && { tags: tagsStr.split(",").filter(Boolean) }),
    isPublic: isPublicStr === "true",
  });

  return NextResponse.json(asset, { status: 201 });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "assets3d.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "assets3d.POST" });
