const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_SEARCH_API_URL =
  process.env.BRAVE_SEARCH_API_URL || "https://api.search.brave.com/res/v1/web/search";
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
const GOOGLE_SEARCH_API_URL =
  process.env.GOOGLE_SEARCH_API_URL || "https://www.googleapis.com/customsearch/v1";
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_API_URL = process.env.SERPAPI_API_URL || "https://serpapi.com/search.json";

export const fetchDuckDuckGoResults = async (query: string) => {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Search fetch failed (${response.status}).`);
  }
  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet?: string }> = [];
  const resultRegex =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html))) {
    const rawUrl = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const url = rawUrl.includes("duckduckgo.com/l/")
      ? decodeURIComponent(
          new URL(rawUrl).searchParams.get("uddg") ?? rawUrl
        )
      : rawUrl;
    if (title && url) {
      results.push({ title, url });
    }
    if (results.length >= 6) break;
  }
  return results;
};

export const fetchSearchResults = async (
  query: string,
  provider: string,
  log?: (level: string, message: string, metadata?: Record<string, unknown>) => Promise<void>
) => {
  const normalizedProvider = provider.toLowerCase();
  
  if (normalizedProvider === "brave") {
    try {
      if (!BRAVE_SEARCH_API_KEY) {
        throw new Error("Brave search API key not configured.");
      }
      const url = new URL(BRAVE_SEARCH_API_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("count", "6");
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": BRAVE_SEARCH_API_KEY,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        web?: { results?: Array<{ title?: string; url?: string }> };
      };
      return (
        data.web?.results
          ?.map((item) => ({
            title: item.title || "Untitled",
            url: item.url || "",
          }))
          .filter((item) => item.url) || []
      );
    } catch (error) {
      if (log) {
        await log("warning", "Brave search failed; falling back to DuckDuckGo.", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }
  
  if (normalizedProvider === "google") {
    try {
      if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
        throw new Error("Google search API key/engine not configured.");
      }
      const url = new URL(GOOGLE_SEARCH_API_URL);
      url.searchParams.set("key", GOOGLE_SEARCH_API_KEY);
      url.searchParams.set("cx", GOOGLE_SEARCH_ENGINE_ID);
      url.searchParams.set("q", query);
      url.searchParams.set("num", "6");
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        items?: Array<{ title?: string; link?: string }>;
      };
      return (
        data.items
          ?.map((item) => ({
            title: item.title || "Untitled",
            url: item.link || "",
          }))
          .filter((item) => item.url) || []
      );
    } catch (error) {
       if (log) {
        await log("warning", "Google search failed; falling back to DuckDuckGo.", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }
  
  if (normalizedProvider === "serpapi") {
    try {
      if (!SERPAPI_API_KEY) {
        throw new Error("SerpApi key not configured.");
      }
      const url = new URL(SERPAPI_API_URL);
      url.searchParams.set("api_key", SERPAPI_API_KEY);
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", query);
      url.searchParams.set("num", "6");
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Search failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        organic_results?: Array<{ title?: string; link?: string }>;
      };
      return (
        data.organic_results
          ?.map((item) => ({
            title: item.title || "Untitled",
            url: item.link || "",
          }))
          .filter((item) => item.url) || []
      );
    } catch (error) {
      if (log) {
        await log("warning", "SerpApi search failed; falling back to DuckDuckGo.", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return await fetchDuckDuckGoResults(query);
    }
  }
  
  if (log) {
    await log("warning", "Unsupported search provider; falling back to DuckDuckGo.", {
        provider,
    });
  }
  return await fetchDuckDuckGoResults(query);
};
