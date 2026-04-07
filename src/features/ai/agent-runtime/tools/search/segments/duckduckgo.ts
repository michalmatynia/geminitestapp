export const fetchDuckDuckGoResults = async (
  query: string
): Promise<Array<{ title: string; url: string; snippet?: string }>> => {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Search fetch failed (${response.status}).`);
  }
  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet?: string }> = [];
  const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html))) {
    const rawUrl = match[1];
    const rawTitle = match[2];
    if (!rawUrl || !rawTitle) continue;
    const title = rawTitle.replace(/<[^>]+>/g, '').trim();
    const url = rawUrl.includes('duckduckgo.com/l/')
      ? decodeURIComponent(
        new URL(rawUrl, 'https://duckduckgo.com').searchParams.get('uddg') ?? rawUrl
      )
      : rawUrl;
    if (title && url) {
      results.push({ title, url });
    }
    if (results.length >= 6) break;
  }
  return results;
};
