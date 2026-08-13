export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This temporary destructive endpoint has been disabled.',
  }, { status: 410 });
}
