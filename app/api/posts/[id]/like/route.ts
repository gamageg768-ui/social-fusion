import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const rl = checkRateLimit(`like:${me.id}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.like.findUnique({
      where: { user_id_post_id: { user_id: me.id, post_id: postId } },
    });

    if (existing) {
      await tx.like.delete({ where: { user_id_post_id: { user_id: me.id, post_id: postId } } });
      const post = await tx.post.update({ where: { id: postId }, data: { likes_count: { decrement: 1 } } });
      return { liked: false, likes_count: post.likes_count };
    }

    await tx.like.create({ data: { user_id: me.id, post_id: postId } });
    const post = await tx.post.update({ where: { id: postId }, data: { likes_count: { increment: 1 } } });

    const orig = await tx.post.findUnique({ where: { id: postId } });
    if (orig && orig.user_id !== me.id) {
      await tx.notification.create({
        data: { user_id: orig.user_id, actor_id: me.id, notif_type: 'like', content: `${me.name} liked your post` },
      });
    }

    return { liked: true, likes_count: post.likes_count };
  });

  return NextResponse.json(result);
}
