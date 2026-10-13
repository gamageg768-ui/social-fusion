import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.user_id !== me.id) {
    return NextResponse.json({ error: 'Not your post' }, { status: 403 });
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { is_anonymous: false },
    include: { user: true },
  });

  return NextResponse.json({ ...serializePost(updated), is_anonymous: false, is_own_anonymous: false });
}
