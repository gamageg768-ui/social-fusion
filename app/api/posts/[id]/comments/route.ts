import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeComment } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();

  const comments = await prisma.comment.findMany({
    where: { post_id: Number(params.id), parent_id: null },
    include: {
      user: true,
      replies: { include: { user: true }, orderBy: { created_at: 'asc' } },
    },
    orderBy: { created_at: 'desc' },
    take: 30,
  });

  return NextResponse.json(comments.map(serializeComment));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { content, parent_id, stance } = await req.json();
  const postId = Number(params.id);

  const comment = await prisma.comment.create({
    data: {
      post_id: postId,
      user_id: me.id,
      content,
      parent_id: parent_id ? Number(parent_id) : null,
      stance: stance || '',
    },
    include: { user: true, replies: { include: { user: true } } },
  });

  if (!parent_id) {
    await prisma.post.update({ where: { id: postId }, data: { comments_count: { increment: 1 } } });
    // Recalculate avg_comment_length for comment quality signal
    const allTopLevelComments = await prisma.comment.findMany({
      where: { post_id: postId, parent_id: null },
      select: { content: true },
      take: 100,
    });
    if (allTopLevelComments.length > 0) {
      const avgLen = allTopLevelComments.reduce(
        (s: number, c: { content: string }) => s + c.content.length, 0
      ) / allTopLevelComments.length;
      await prisma.post.update({ where: { id: postId }, data: { avg_comment_length: Math.round(avgLen) } });
    }
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (post && post.user_id !== me.id) {
    await prisma.notification.create({
      data: { user_id: post.user_id, actor_id: me.id, notif_type: 'comment', content: `${me.name} commented on your post` },
    });
  }

  return NextResponse.json(serializeComment(comment), { status: 201 });
}
