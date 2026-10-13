import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { tag: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const tag = decodeURIComponent(params.tag).replace(/^#/, '');
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const perPage = 15;
  const skip = (page - 1) * perPage;

  const where = {
    content: { contains: `#${tag}` },
    OR: [{ scheduled_at: null as null }, { scheduled_at: { lte: new Date() } }],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: true,
        likes: { where: { user_id: meId }, take: 1 },
        bookmarks: { where: { user_id: meId }, take: 1 },
        ref_post: { include: { user: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map(p => ({ ...serializePost(p), liked: p.likes.length > 0, bookmarked: p.bookmarks.length > 0 })),
    has_next: skip + perPage < total,
    total,
    tag,
  });
}
