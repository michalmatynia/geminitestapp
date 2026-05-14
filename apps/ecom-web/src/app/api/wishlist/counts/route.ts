import { type NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';

// GET — public endpoint; returns wishlist counts for the requested product IDs
export async function GET(req: NextRequest): Promise<NextResponse> {
  const raw = req.nextUrl.searchParams.get('productIds') ?? '';
  const productIds = raw.split(',').map((id) => id.trim()).filter(Boolean);
  if (productIds.length === 0) return NextResponse.json({ counts: {} });
  if (productIds.length > 100) {
    return NextResponse.json({ error: 'Too many productIds (max 100)' }, { status: 400 });
  }

  try {
    const db = await getEcomAuthDb();
    const docs = await db
      .collection('ecom_wishlist_counts')
      .find({ productId: { $in: productIds } }, { projection: { _id: 0, productId: 1, count: 1 } })
      .toArray();

    const counts: Record<string, number> = {};
    for (const doc of docs) {
      if (typeof doc['productId'] === 'string' && typeof doc['count'] === 'number') {
        counts[doc['productId']] = doc['count'];
      }
    }
    return NextResponse.json({ counts });
  } catch {
    return NextResponse.json({ counts: {} });
  }
}
