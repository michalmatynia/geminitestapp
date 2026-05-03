import { NextResponse } from 'next/server';

export function GET(): Response {
  return NextResponse.json(
    {
      error: 'WebSocket upgrade required.',
    },
    { status: 426 }
  );
}
