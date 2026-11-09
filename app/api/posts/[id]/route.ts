import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { serializeUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const postId = Number(params.id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { user: true },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...post,
    created_at: post.created_at.toISOString(),
    user: serializeUser(post.user),
  });
}
