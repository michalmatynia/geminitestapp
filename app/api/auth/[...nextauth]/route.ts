import { handlers } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = async (req: Request) => {
  console.log("[AUTH-API] GET request", req.url);
  return handlers.GET(req);
};

export const POST = async (req: Request) => {
  console.log("[AUTH-API] POST request", req.url);
  return handlers.POST(req);
};
