const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="#f9f8f5"/>
  <rect x="13" y="13" width="38" height="38" fill="none" stroke="#1a1918" stroke-width="3"/>
  <path d="M13 32h38M32 13v38M20 20c8 4 16 4 24 0M20 44c8-4 16-4 24 0" fill="none" stroke="#857a72" stroke-width="2"/>
</svg>`;

export function GET(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}
