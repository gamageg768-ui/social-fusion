import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost, serializeUser } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const q = req.nextUrl.searchParams.get('q') || '';

  if (!q.trim()) return NextResponse.json({ users: [], posts: [], hashtags: [] });

  const meId = me?.id ?? -1;

  const [users, posts] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      take: 10,
    }),
    prisma.post.findMany({
      where: { content: { contains: q } },
      include: {
        user: true,
        likes: { where: { user_id: meId }, take: 1 },
        bookmarks: { where: { user_id: meId }, take: 1 },
        ref_post: { include: { user: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    }),
  ]);

  // Extract hashtags from matching posts
  const hashtagCounts: Record<string, number> = {};
  posts.forEach(p => {
    const tags = p.content.match(/#\w+/g) || [];
    tags.forEach(t => { hashtagCounts[t] = (hashtagCounts[t] || 0) + 1; });
  });
  const hashtags = Object.entries(hashtagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    users: users.map(serializeUser),
    posts: posts.map(p => ({
      ...serializePost(p),
      liked: p.likes.length > 0,
      bookmarked: p.bookmarks.length > 0,
    })),
    hashtags,
  });
}
