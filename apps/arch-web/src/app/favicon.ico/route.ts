const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#eceae6"/>
  <path d="M14 48V16h8l10 18 10-18h8v32h-8V30L34 48h-4L22 30v18z" fill="#1a1918"/>
</svg>`;

export function GET(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'image/svg+xml',
    },
  });
}
