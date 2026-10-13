import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const postId = Number(params.id);

  const reactions = await prisma.postReaction.findMany({
    where: { post_id: postId },
    include: { user: { select: { id: true, name: true, username: true, avatar: true } } },
  });

  const grouped: Record<string, { count: number; users: { id: number; name: string; username: string; avatar: string }[] }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user);
  }

  const myReaction = me ? reactions.find(r => r.user_id === me.id)?.emoji ?? null : null;

  return NextResponse.json({ grouped, my_reaction: myReaction, total: reactions.length });
}
