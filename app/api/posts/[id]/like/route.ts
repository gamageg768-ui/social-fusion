import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const existing = await prisma.like.findUnique({
    where: { user_id_post_id: { user_id: me.id, post_id: postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { user_id_post_id: { user_id: me.id, post_id: postId } } });
    const post = await prisma.post.update({ where: { id: postId }, data: { likes_count: { decrement: 1 } } });
    return NextResponse.json({ liked: false, likes_count: post.likes_count });
  }

  await prisma.like.create({ data: { user_id: me.id, post_id: postId } });
  const post = await prisma.post.update({ where: { id: postId }, data: { likes_count: { increment: 1 } } });

  const orig = await prisma.post.findUnique({ where: { id: postId } });
  if (orig && orig.user_id !== me.id) {
    await prisma.notification.create({
      data: { user_id: orig.user_id, actor_id: me.id, notif_type: 'like', content: `${me.name} liked your post` },
    });
  }

  return NextResponse.json({ liked: true, likes_count: post.likes_count });
}
