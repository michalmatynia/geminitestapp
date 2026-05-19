import { NextResponse } from 'next/server';
import { getDownloadOrderByCode } from '@/lib/orders';
import { renderPatternSvg } from '@/lib/patternAssets';
import { getPatternProducts } from '@/lib/patternsRepository';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ code: string; patternId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { code, patternId } = await context.params;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const order = await getDownloadOrderByCode(code, token);

  if (order === null) {
    return NextResponse.json({ error: 'Download order was not found.' }, { status: 404 });
  }

  const item = order.items.find((entry) => entry.patternId === patternId);
  if (item === undefined) {
    return NextResponse.json({ error: 'Pattern is not included in this order.' }, { status: 404 });
  }

  const { patterns } = await getPatternProducts();
  const pattern = patterns.find((entry) => entry.id === patternId);
  if (pattern === undefined) {
    return NextResponse.json({ error: 'Pattern file is not available.' }, { status: 404 });
  }

  const svg = renderPatternSvg(pattern);
  const filename = `${pattern.slug}-${item.licenseId}.svg`;

  return new Response(svg, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  });
}
