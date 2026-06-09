import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const comments = await prisma.comment.findMany({
    where: { post_id: Number(params.id) },
    include: { user: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(comments.map(c => ({
    ...c,
    created_at: c.created_at.toISOString(),
    user: { ...c.user, created_at: c.user.created_at.toISOString() },
  })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const data = await req.json();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  const [comment] = await Promise.all([
    prisma.comment.create({
      data: {
        post_id: Number(params.id),
        user_id: me!.id,
        content: data.content || '',
        likes_count: 0,
      },
      include: { user: true },
    }),
    prisma.post.update({
      where: { id: Number(params.id) },
      data: { comments_count: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    ...comment,
    created_at: comment.created_at.toISOString(),
    user: { ...comment.user, created_at: comment.user.created_at.toISOString() },
  }, { status: 201 });
}
