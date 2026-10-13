import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const highlights = await prisma.highlight.findMany({
    where: { user_id: Number(params.id) },
    include: { stories: { take: 1 } },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(highlights.map(h => ({ ...h, created_at: h.created_at.toISOString() })));
}
