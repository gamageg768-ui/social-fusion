import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string; postId: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { emoji } = await req.json().catch(() => ({}));
  const cp = await prisma.channelPost.findFirst({ where: { channel_id: Number(params.id), id: Number(params.postId) } });
  if (!cp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.channelReaction.create({ data: { channel_post_id: cp.id, user_id: me.id, emoji } }).catch(() => {});
  const reactions = await prisma.channelReaction.findMany({ where: { channel_post_id: cp.id } });
  const grouped: Record<string, number> = {};
  for (const r of reactions) { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; }
  return NextResponse.json({ reactions: Object.entries(grouped).map(([emoji, count]) => ({ emoji, count })), my_reaction: emoji });
}
