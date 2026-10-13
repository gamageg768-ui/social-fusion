import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { user_id: true } });
  if (!post || post.user_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.post.update({ where: { id: postId }, data: { is_stale: false } });
  return NextResponse.json({ ok: true });
}
