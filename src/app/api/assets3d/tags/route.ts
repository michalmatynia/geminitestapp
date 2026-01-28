import { NextResponse } from "next/server";
import { getAsset3DRepository } from "@/features/viewer3d/server";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function GET_handler() {
  const repository = getAsset3DRepository();
  const tags = await repository.getTags();
  return NextResponse.json(tags);
}

export const GET = apiHandler(GET_handler, { source: "assets3d/tags.GET" });
