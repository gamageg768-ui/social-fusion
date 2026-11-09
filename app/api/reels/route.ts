import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { serializeUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const reels = await prisma.reel.findMany({
    include: { user: true },
    orderBy: { views_count: 'desc' },
  });

  return NextResponse.json(reels.map(r => ({
    ...r,
    created_at: r.created_at.toISOString(),
    user: serializeUser(r.user),
  })));
}
