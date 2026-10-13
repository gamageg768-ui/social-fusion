import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.user_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const willPin = !post.is_pinned;

  if (willPin) {
    // Unpin any existing pinned post first
    await prisma.post.updateMany({ where: { user_id: me.id, is_pinned: true }, data: { is_pinned: false } });
  }

  await prisma.post.update({ where: { id: postId }, data: { is_pinned: willPin } });
  return NextResponse.json({ is_pinned: willPin });
}
