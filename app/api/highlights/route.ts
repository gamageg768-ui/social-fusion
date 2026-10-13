import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);
  const highlights = await prisma.highlight.findMany({
    where: { user_id: me.id },
    include: { stories: { take: 5 } },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(highlights.map(h => ({ ...h, created_at: h.created_at.toISOString() })));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, cover_url } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const h = await prisma.highlight.create({ data: { user_id: me.id, name: name.trim(), cover_url: cover_url ?? '' }, include: { stories: true } });
  return NextResponse.json({ ...h, created_at: h.created_at.toISOString() }, { status: 201 });
}
