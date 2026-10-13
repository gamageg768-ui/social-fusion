import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';
import { extractHashtags } from '@/lib/feedUtils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();

  if (!me) {
    const users = await prisma.user.findMany({ orderBy: { followers_count: 'desc' }, take: 8 });
    return NextResponse.json(users.map((u: { created_at: Date; last_seen: Date | null; [key: string]: unknown }) => ({
      ...u,
      created_at: u.created_at.toISOString(),
      last_seen: u.last_seen ? u.last_seen.toISOString() : null,
    })));
  }

  // Users I already follow + myself
  const myFollows = await prisma.follow.findMany({
    where: { follower_id: me.id },
    select: { following_id: true },
  });
  const alreadyFollowingIds = new Set<number>([me.id, ...myFollows.map((f: { following_id: number }) => f.following_id)]);

  // FOF: who do my followed users follow?
  const followedIds = [...alreadyFollowingIds].filter(id => id !== me.id);

  const [fofFollows, myLikedPosts, allCandidates] = await Promise.all([
    followedIds.length > 0
      ? prisma.follow.findMany({
          where: { follower_id: { in: followedIds } },
          select: { following_id: true, follower_id: true },
        })
      : Promise.resolve([]),
    prisma.like.findMany({
      where: { user_id: me.id },
      select: { post: { select: { content: true } } },
      take: 100,
      orderBy: { created_at: 'desc' },
    }),
    prisma.user.findMany({
      where: { id: { notIn: [...alreadyFollowingIds] } },
      select: {
        id: true, username: true, name: true, avatar: true, bio: true,
        followers_count: true, following_count: true, posts_count: true,
        is_verified: true, is_private: true, location: true, website: true,
        last_seen: true, status_emoji: true, status_text: true, presence: true,
        created_at: true, cover: true,
      },
    }),
  ]);

  // Build hashtag affinity from my likes
  const myTagCounts: Record<string, number> = {};
  for (const l of myLikedPosts) {
    for (const tag of extractHashtags(l.post?.content ?? '')) {
      myTagCounts[tag] = (myTagCounts[tag] ?? 0) + 1;
    }
  }
  const myTopTags = new Set(Object.entries(myTagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t));

  // FOF score: how many of my follows also follow this person
  const fofScoreMap: Record<number, number> = {};
  for (const f of fofFollows as { following_id: number }[]) {
    if (!alreadyFollowingIds.has(f.following_id)) {
      fofScoreMap[f.following_id] = (fofScoreMap[f.following_id] ?? 0) + 1;
    }
  }

  // Score each candidate
  const scored = (allCandidates as {
    id: number; username: string; name: string; avatar: string; bio: string;
    followers_count: number; following_count: number; posts_count: number;
    is_verified: boolean; is_private: boolean; location: string; website: string;
    last_seen: Date | null; status_emoji: string; status_text: string;
    presence: string; created_at: Date; cover: string;
  }[]).map(u => {
    let score = 0;

    // Tier 1: FOF (followed by ≥2 people I follow → +10, ≥1 → +5)
    const fofCount = fofScoreMap[u.id] ?? 0;
    if (fofCount >= 2) score += 10;
    else if (fofCount === 1) score += 5;

    // Tier 2: Active in hashtags I like
    const userBioTags = extractHashtags(u.bio);
    for (const tag of userBioTags) {
      if (myTopTags.has(tag)) score += 5;
    }

    // Tier 3: Verified accounts I don't follow
    if (u.is_verified) score += 3;

    // Slight boost for popular accounts
    score += Math.log(1 + u.followers_count) * 0.1;

    return { u, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json(
    scored.slice(0, 8).map(({ u }) => ({
      ...u,
      created_at: u.created_at.toISOString(),
      last_seen: u.last_seen ? u.last_seen.toISOString() : null,
    }))
  );
}
