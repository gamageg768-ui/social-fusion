import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const postId = Number(params.id);

  const autopsy = await prisma.postAutopsy.findUnique({ where: { post_id: postId } });
  if (!autopsy) return NextResponse.json(null);

  return NextResponse.json({
    ...autopsy,
    top_reactions: (() => { try { return JSON.parse(autopsy.top_reactions); } catch { return []; } })(),
    archived_at: autopsy.archived_at.toISOString(),
  });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      reactions: true,
      dwell_times: { select: { seconds: true } },
    },
  });

  if (!post || post.user_id !== me.id) {
    return NextResponse.json({ error: 'Not your post' }, { status: 403 });
  }

  const avgDwell = post.dwell_times.length > 0
    ? post.dwell_times.reduce((s: number, d: { seconds: number }) => s + d.seconds, 0) / post.dwell_times.length
    : 0;

  const reactionCounts: Record<string, number> = {};
  for (const r of post.reactions as { emoji: string }[]) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
  }
  const topReactions = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emoji, count]) => ({ emoji, count }));

  const autopsy = await prisma.postAutopsy.upsert({
    where: { post_id: postId },
    create: {
      post_id: postId,
      peak_likes: post.likes_count,
      peak_comments: post.comments_count,
      peak_shares: post.shares_count,
      total_views: post.view_count,
      avg_dwell_secs: avgDwell,
      top_reactions: JSON.stringify(topReactions),
    },
    update: {
      peak_likes: post.likes_count,
      peak_comments: post.comments_count,
      peak_shares: post.shares_count,
      total_views: post.view_count,
      avg_dwell_secs: avgDwell,
      top_reactions: JSON.stringify(topReactions),
      archived_at: new Date(),
    },
  });

  return NextResponse.json({
    ...autopsy,
    top_reactions: topReactions,
    archived_at: autopsy.archived_at.toISOString(),
  }, { status: 201 });
}
