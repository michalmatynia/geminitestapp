import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrdersForUser } from '@/lib/orders';

export async function GET(): Promise<NextResponse> {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json(orders);
}
