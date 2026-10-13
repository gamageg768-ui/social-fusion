import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const existing = await prisma.bookmark.findUnique({
    where: { user_id_post_id: { user_id: me.id, post_id: postId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { user_id_post_id: { user_id: me.id, post_id: postId } } });
    return NextResponse.json({ bookmarked: false });
  }

  await prisma.bookmark.create({ data: { user_id: me.id, post_id: postId } });
  return NextResponse.json({ bookmarked: true });
}
