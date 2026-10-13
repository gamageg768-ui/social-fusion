import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;

  const follows = await prisma.follow.findMany({
    where: { following_id: Number(params.id) },
    include: {
      follower: true,
    },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  const followerIds = follows.map(f => f.follower_id);
  const myFollows = meId !== -1
    ? await prisma.follow.findMany({ where: { follower_id: meId, following_id: { in: followerIds } } })
    : [];
  const followingSet = new Set(myFollows.map(f => f.following_id));

  return NextResponse.json(
    follows.map(f => ({
      ...serializeUser(f.follower),
      is_following: followingSet.has(f.follower_id),
    }))
  );
}
