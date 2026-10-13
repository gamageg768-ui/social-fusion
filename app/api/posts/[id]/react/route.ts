import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

const VALID_EMOJIS = new Set(['❤️', '😂', '😮', '😢', '😡', '👏']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = Number(params.id);
  const { emoji } = await req.json().catch(() => ({}));

  if (!VALID_EMOJIS.has(emoji)) return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });

  const existing = await prisma.postReaction.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: me.id } },
  });

  if (existing?.emoji === emoji) {
    await prisma.postReaction.delete({ where: { post_id_user_id: { post_id: postId, user_id: me.id } } });
    return NextResponse.json({ my_reaction: null });
  }

  await prisma.postReaction.upsert({
    where: { post_id_user_id: { post_id: postId, user_id: me.id } },
    update: { emoji },
    create: { post_id: postId, user_id: me.id, emoji },
  });

  return NextResponse.json({ my_reaction: emoji });
}
