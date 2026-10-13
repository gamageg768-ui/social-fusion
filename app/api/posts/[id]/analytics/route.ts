import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = Number(params.id);

  await prisma.post.update({ where: { id: postId }, data: { view_count: { increment: 1 } } });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { view_count: true, likes_count: true, comments_count: true, shares_count: true, created_at: true },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const reactionCount = await prisma.postReaction.count({ where: { post_id: postId } });

  const totalEngagements = post.likes_count + post.comments_count + post.shares_count + reactionCount;
  const engagementRate = post.view_count > 0
    ? ((totalEngagements / post.view_count) * 100).toFixed(1)
    : '0.0';

  return NextResponse.json({
    view_count: post.view_count,
    likes_count: post.likes_count,
    comments_count: post.comments_count,
    shares_count: post.shares_count,
    reaction_count: reactionCount,
    engagement_rate: engagementRate,
  });
}
