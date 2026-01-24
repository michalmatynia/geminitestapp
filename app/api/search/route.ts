import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/parse-json";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import {
  badRequestError,
  configurationError,
  externalServiceError,
} from "@/lib/errors/app-error";

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

type GoogleSearchItem = {
  title?: string;
  link?: string;
  snippet?: string;
};

type GoogleSearchResponse = {
  items?: GoogleSearchItem[];
};

const searchSchema = z.object({
  query: z.string().trim().optional(),
  limit: z.coerce.number().int().optional(),
  provider: z.string().trim().optional(),
});

const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_API_URL =
  process.env.BRAVE_SEARCH_API_URL || "https://api.search.brave.com/res/v1/web/search";
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_URL =
  process.env.GOOGLE_SEARCH_API_URL || "https://www.googleapis.com/customsearch/v1";
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_API_URL = process.env.SERPAPI_API_URL || "https://serpapi.com/search.json";

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, searchSchema, {
      logPrefix: "search",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const query = parsed.data.query ?? "";
    const limit = Math.min(Math.max(parsed.data.limit ?? 5, 1), 10);
    const provider = parsed.data.provider?.toLowerCase() || "brave";

    if (!query) {
      throw badRequestError("Query is required");
    }

    if (provider === "brave") {
      if (!BRAVE_SEARCH_API_KEY) {
        throw configurationError("Brave search API key not configured");
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
        throw externalServiceError(
          `Search provider error: ${errorText || res.statusText}`,
          { provider: "brave", statusCode: res.status }
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
    }

    if (provider === "google") {
      if (!GOOGLE_SEARCH_API_KEY) {
        throw configurationError("Google search API key not configured");
      }
      if (!GOOGLE_SEARCH_ENGINE_ID) {
        throw configurationError("Google search engine ID not configured");
      }
      const url = new URL(GOOGLE_SEARCH_API_URL);
      url.searchParams.set("key", GOOGLE_SEARCH_API_KEY);
      url.searchParams.set("cx", GOOGLE_SEARCH_ENGINE_ID);
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(limit));

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errorText = await res.text();
        throw externalServiceError(
          `Search provider error: ${errorText || res.statusText}`,
          { provider: "google", statusCode: res.status }
        );
      }

      const data = (await res.json()) as GoogleSearchResponse;
      const results =
        data.items?.map((item) => ({
          title: item.title || "Untitled",
          url: item.link || "",
          description: item.snippet || "",
        })) || [];

      return NextResponse.json({ results });
    }

    if (provider === "serpapi") {
      if (!SERPAPI_API_KEY) {
        throw configurationError("SerpApi key not configured");
      }

      const url = new URL(SERPAPI_API_URL);
      url.searchParams.set("api_key", SERPAPI_API_KEY);
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(limit));

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errorText = await res.text();
        throw externalServiceError(
          `Search provider error: ${errorText || res.statusText}`,
          { provider: "serpapi", statusCode: res.status }
        );
      }

      const data = (await res.json()) as {
        organic_results?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
        }>;
      };

      const results =
        data.organic_results?.map((item) => ({
          title: item.title || "Untitled",
          url: item.link || "",
          description: item.snippet || "",
        })) || [];

      return NextResponse.json({ results });
    }

    throw badRequestError("Unsupported search provider", { provider });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "search.POST",
      fallbackMessage: "Failed to perform search",
    });
  }
}
