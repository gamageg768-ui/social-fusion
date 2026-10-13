import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const h = await prisma.highlight.findUnique({ where: { id: Number(params.id) } });
  if (!h || h.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { image_url, story_id, post_id } = await req.json().catch(() => ({}));
  const hs = await prisma.highlightStory.create({ data: { highlight_id: h.id, image_url: image_url ?? '', story_id: story_id ?? null, post_id: post_id ?? null } });
  return NextResponse.json({ ...hs, created_at: hs.created_at.toISOString() }, { status: 201 });
}
