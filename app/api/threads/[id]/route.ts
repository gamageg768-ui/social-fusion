import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const threadId = Number(params.id);

  const posts = await prisma.post.findMany({
    where: { thread_id: threadId },
    include: {
      user: true,
      likes: { where: { user_id: meId }, take: 1 },
      bookmarks: { where: { user_id: meId }, take: 1 },
      ref_post: { include: { user: true } },
    },
    orderBy: { thread_index: 'asc' },
  });

  return NextResponse.json(
    posts.map(p => ({
      ...serializePost(p),
      liked: p.likes.length > 0,
      bookmarked: p.bookmarks.length > 0,
    }))
  );
}
