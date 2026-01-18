import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export const GET = async (req: NextRequest) => {
  console.log("[AUTH-API] GET request", req.url);
  return handlers.GET(req);
};

export const POST = async (req: NextRequest) => {
  console.log("[AUTH-API] POST request", req.url);
  return handlers.POST(req);
};
