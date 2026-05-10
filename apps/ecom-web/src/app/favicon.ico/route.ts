const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#05050a"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#68f2ff" stroke-width="3"/>
  <path d="M32 9 38 27 57 32 38 37 32 55 26 37 7 32 26 27Z" fill="#f8d56b"/>
  <circle cx="32" cy="32" r="5" fill="#ff5b8a"/>
</svg>`;

export function GET(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}
