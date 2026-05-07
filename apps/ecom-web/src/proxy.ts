import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Keep the standalone ecommerce workspace isolated from the root platform proxy.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
