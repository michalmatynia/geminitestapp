import { NextResponse } from "next/server";

type BraveSearchResult = {
  title?: string;
  url?: string;
  description?: string;
};

type BraveResponse = {
  web?: {
    results?: BraveSearchResult[];
  };
};

const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_API_URL =
  process.env.BRAVE_SEARCH_API_URL || "https://api.search.brave.com/res/v1/web/search";

export async function POST(req: Request) {
  try {
    if (!BRAVE_SEARCH_API_KEY) {
      return NextResponse.json(
        { error: "Search API key not configured." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as { query?: string; limit?: number };
    const query = body.query?.trim() || "";
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 10);

    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const url = new URL(BRAVE_SEARCH_API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(limit));

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Search provider error: ${errorText || res.statusText}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as BraveResponse;
    const results =
      data.web?.results?.map((item) => ({
        title: item.title || "Untitled",
        url: item.url || "",
        description: item.description || "",
      })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to perform search.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
