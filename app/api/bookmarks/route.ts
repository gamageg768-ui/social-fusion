import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const bookmarks = await prisma.bookmark.findMany({
    where: { user_id: me.id },
    include: {
      post: {
        include: {
          user: true,
          likes: { where: { user_id: me.id }, take: 1 },
          ref_post: { include: { user: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(
    bookmarks.map(b => ({
      ...serializePost(b.post),
      liked: b.post.likes.length > 0,
      bookmarked: true,
    }))
  );
}
