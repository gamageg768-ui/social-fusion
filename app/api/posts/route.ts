import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';
import {
  extractHashtags,
  buildHashtagWeights,
  buildCreatorWeights,
  buildFormatWeights,
  buildDwellWeights,
  getTrendingMap,
  TOPIC_CLUSTERS,
  buildSkipWeights,
  buildTimeSlotWeights,
  getViralSpikeSet,
  buildCreatorPostingFrequency,
  buildContentLengthPreference,
  getBookmarkVelocitySet,
} from '@/lib/feedUtils';

function getPostCluster(content: string): string | null {
  const tags = extractHashtags(content);
  for (const [cluster, clusterTags] of Object.entries(TOPIC_CLUSTERS)) {
    if (tags.some(t => clusterTags.includes(t))) return cluster;
  }
  return null;
}

const ANON_USER = {
  id: 0, username: 'anonymous', name: '🔥 Hot Take', avatar: '', bio: '',
  email: '', cover: '', is_verified: false, followers_count: 0, following_count: 0,
  posts_count: 0, is_private: false, location: '', website: '', presence: 'online',
  status_emoji: '', status_text: '', created_at: new Date(0).toISOString(), last_seen: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePostFull(p: any, meId: number, feedReason?: string) {
  const myReaction = p.reactions?.find((r: any) => r.user_id === meId)?.emoji ?? null;
  const isAnonymous = !!p.is_anonymous;
  const isOwner = p.user_id === meId;
  const reactionPoll: { question: string; options: { label: string; emoji: string }[] } | null = (() => {
    try { return p.reaction_poll ? JSON.parse(p.reaction_poll) : null; } catch { return null; }
  })();
  const myReactionPollVote = p.reaction_poll_votes?.find((v: any) => v.user_id === meId)?.option_idx ?? null;

  const serialized = serializePost(p);
  if (isAnonymous && !isOwner) serialized.user = ANON_USER;

  const postAutopsy = p.post_autopsy ? {
    ...p.post_autopsy,
    top_reactions: (() => { try { return JSON.parse(p.post_autopsy.top_reactions || '[]'); } catch { return []; } })(),
    archived_at: p.post_autopsy.archived_at instanceof Date ? p.post_autopsy.archived_at.toISOString() : p.post_autopsy.archived_at,
  } : null;

  return {
    ...serialized,
    liked: p.likes?.length > 0,
    bookmarked: p.bookmarks?.length > 0,
    my_reaction: myReaction,
    reactions: p.reactions ?? [],
    feed_reason: feedReason ?? null,
    is_anonymous: isAnonymous,
    is_own_anonymous: isAnonymous && isOwner,
    reaction_poll: reactionPoll,
    reaction_poll_votes: p.reaction_poll_votes ?? [],
    my_reaction_poll_vote: myReactionPollVote,
    post_poll: p.post_poll ? {
      ...p.post_poll,
      ends_at: p.post_poll.ends_at.toISOString(),
      created_at: p.post_poll.created_at.toISOString(),
      votes: p.post_poll.votes ?? [],
    } : null,
    locked_until: p.locked_until instanceof Date ? p.locked_until.toISOString() : (p.locked_until ?? null),
    commitment_deadline: p.commitment_deadline instanceof Date ? p.commitment_deadline.toISOString() : (p.commitment_deadline ?? null),
    commitment_update: p.commitment_update ?? '',
    live_widget: p.live_widget ?? '',
    conversation_depth: p.conversation_depth ?? 0,
    is_stale: p.is_stale ?? false,
    persona: p.persona ?? '',
    post_autopsy: postAutopsy,
  };
}

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const postType = req.nextUrl.searchParams.get('type');
  const feed = req.nextUrl.searchParams.get('feed');
  const topic = req.nextUrl.searchParams.get('topic');
  const personaFilter = req.nextUrl.searchParams.get('persona');
  const perPage = 10;

  // Fire-and-forget: auto-mark posts >30 days old with time-sensitive words as stale
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const staleKeywords = ['will ', 'soon', 'today', 'by next', 'coming', 'upcoming', 'plan to'];
  prisma.post.updateMany({
    where: {
      is_stale: false,
      created_at: { lte: thirtyDaysAgo },
      OR: staleKeywords.map(k => ({ content: { contains: k } })),
    },
    data: { is_stale: true },
  }).catch(() => { /* background */ });
  const skip = (page - 1) * perPage;

  const notInterestedIds = me
    ? (await prisma.notInterested.findMany({ where: { user_id: me.id }, select: { post_id: true } })).map((n: { post_id: number }) => n.post_id)
    : [];

  const baseInclude = {
    user: true,
    collab_user: true,
    likes: { where: { user_id: meId }, take: 1 },
    bookmarks: { where: { user_id: meId }, take: 1 },
    ref_post: { include: { user: true } },
    reactions: true,
    post_poll: { include: { votes: true } },
    reaction_poll_votes: true,
    post_autopsy: true,
  } as const;

  if (feed === 'foryou') {
    // Feature 11 — feed mix controls
    const mix = (me as any)?.feed_mix ?? 'balanced';
    const socialLimit = mix === 'friends' ? 120 : mix === 'discover' ? 30 : 60;
    const viralLimit  = mix === 'discover' ? 80  : mix === 'friends'  ? 20 : 40;
    const fofLimit    = mix === 'discover' ? 80  : mix === 'friends'  ? 20 : 40;

    // Stage 2: User interest profile (all parallel)
    const [
      followedIds, notIntCreatorIds, mutedWordsList, mutedUserIds,
      seenPostIds, hashWeights, creatorWeights, formatWeights, dwellWeights,
      skipWeights, timeSlotWeights, recentFollowsRaw, sessionTagCounts,
      engagedThreadIds, userCommunityIds, contentLengthPref,
    ] = await Promise.all([
      me ? prisma.follow.findMany({ where: { follower_id: me.id }, select: { following_id: true } })
             .then((f: { following_id: number }[]) => f.map(x => x.following_id))
         : Promise.resolve([] as number[]),
      me ? prisma.notInterested.findMany({ where: { user_id: me.id }, select: { post: { select: { user_id: true } } } })
             .then((n: { post: { user_id: number } }[]) => [...new Set(n.map(x => x.post.user_id))])
         : Promise.resolve([] as number[]),
      me ? prisma.mutedWord.findMany({ where: { user_id: me.id }, select: { word: true } })
             .then((m: { word: string }[]) => m.map(x => x.word.toLowerCase()))
         : Promise.resolve([] as string[]),
      // Feature 10 — muted users
      me ? prisma.mutedUser.findMany({ where: { user_id: me.id }, select: { muted_id: true } })
             .then((m: { muted_id: number }[]) => m.map(x => x.muted_id))
         : Promise.resolve([] as number[]),
      me ? prisma.postImpression.findMany({ where: { user_id: me.id }, select: { post_id: true }, take: 500, orderBy: { created_at: 'desc' } })
             .then((imp: { post_id: number }[]) => imp.map(x => x.post_id))
         : Promise.resolve([] as number[]),
      me ? buildHashtagWeights(me.id, prisma) : Promise.resolve({} as Record<string, number>),
      me ? buildCreatorWeights(me.id, prisma) : Promise.resolve({} as Record<number, number>),
      me ? buildFormatWeights(me.id, prisma)  : Promise.resolve({} as Record<string, number>),
      me ? buildDwellWeights(me.id, prisma)   : Promise.resolve({} as Record<number, number>),
      // New signals
      me ? buildSkipWeights(me.id, prisma)    : Promise.resolve({} as Record<number, number>),
      me ? buildTimeSlotWeights(me.id, prisma): Promise.resolve({} as Record<string, number>),
      me ? prisma.follow.findMany({
             where: { follower_id: me.id, created_at: { gte: new Date(Date.now() - 7 * 24 * 3600000) } },
             select: { following_id: true, created_at: true },
           })
         : Promise.resolve([] as { following_id: number; created_at: Date }[]),
      me ? prisma.postImpression.findMany({
             where: { user_id: me.id },
             select: { post: { select: { content: true } }, created_at: true },
             orderBy: { created_at: 'desc' },
             take: 10,
           }).then((imps: { post: { content: string } | null; created_at: Date }[]) => {
             const counts: Record<string, number> = {};
             for (const imp of imps) {
               if (!imp.post?.content) continue;
               for (const tag of extractHashtags(imp.post.content))
                 counts[tag] = (counts[tag] ?? 0) + 1;
             }
             return counts;
           })
         : Promise.resolve({} as Record<string, number>),
      // Thread affinity — thread IDs the user has liked posts in (last 30d)
      me ? prisma.like.findMany({
             where: { user_id: me.id, created_at: { gte: new Date(Date.now() - 30 * 24 * 3600000) } },
             select: { post: { select: { thread_id: true } } },
             take: 200,
           }).then((ls: { post: { thread_id: number | null } | null }[]) =>
             new Set(ls.map(l => l.post?.thread_id).filter((id): id is number => id !== null && id !== undefined))
           )
         : Promise.resolve(new Set<number>()),
      // Community membership — communities the user belongs to
      me ? prisma.communityMember.findMany({
             where: { user_id: me.id },
             select: { community_id: true },
           }).then((cm: { community_id: number }[]) => cm.map((m: { community_id: number }) => m.community_id))
         : Promise.resolve([] as number[]),
      // Content length preference — short / medium / long
      me ? buildContentLengthPreference(me.id, prisma)
         : Promise.resolve('medium' as 'short' | 'medium' | 'long'),
    ]);

    // Feature 4 — trending map (cached)
    const trendingMap = await getTrendingMap(prisma);

    // Viral spike set (any-age posts, 5-min cache)
    const viralSpikeSet = await getViralSpikeSet(prisma);

    // Reciprocal creators: people who liked/commented on MY posts in last 30d
    const reciprocalCreatorIds = new Set<number>();
    if (me) {
      const myPostIds = await prisma.post.findMany({
        where: { user_id: me.id },
        select: { id: true },
        take: 100,
        orderBy: { created_at: 'desc' },
      }).then((ps: { id: number }[]) => ps.map((p: { id: number }) => p.id));
      if (myPostIds.length > 0) {
        const thirtyDaysAgo2 = new Date(Date.now() - 30 * 24 * 3600000);
        const [recipLikes, recipComments] = await Promise.all([
          prisma.like.findMany({
            where: { post_id: { in: myPostIds }, created_at: { gte: thirtyDaysAgo2 }, user_id: { not: me.id } },
            select: { user_id: true }, take: 200,
          }),
          prisma.comment.findMany({
            where: { post_id: { in: myPostIds }, created_at: { gte: thirtyDaysAgo2 }, user_id: { not: me.id } },
            select: { user_id: true }, take: 200,
          }),
        ]);
        for (const l of recipLikes)    reciprocalCreatorIds.add(l.user_id);
        for (const c of recipComments) reciprocalCreatorIds.add(c.user_id);
      }
    }

    // New-follow map: creator_id → follow age in days (for recency boost)
    const recentFollowMap = new Map<number, number>();
    for (const f of recentFollowsRaw as { following_id: number; created_at: Date }[]) {
      const ageDays = (Date.now() - new Date(f.created_at).getTime()) / 86400000;
      recentFollowMap.set(f.following_id, ageDays);
    }

    const followedSet       = new Set<number>(followedIds);
    const notIntCreatorSet  = new Set<number>(notIntCreatorIds);
    const mutedSet          = new Set<string>(mutedWordsList);
    const mutedUserSet      = new Set<number>(mutedUserIds);

    let topTags = Object.entries(hashWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Feature 12 — topic filter: restrict to cluster tags
    const topicTags: string[] | null = topic && TOPIC_CLUSTERS[topic] ? TOPIC_CLUSTERS[topic] : null;
    if (topicTags) topTags = topTags.filter(t => topicTags.includes(t)).concat(topicTags.filter(t => !topTags.includes(t)));

    const nowDate = new Date();
    const sevenDaysAgo      = new Date(Date.now() - 7  * 24 * 3600000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600000);
    const sixHoursAgo       = new Date(Date.now() - 6  * 3600000);

    const excludeIds = [...notInterestedIds, ...seenPostIds.slice(0, 200)];

    const basePostWhere = {
      id: { notIn: excludeIds },
      AND: [
        { OR: [{ scheduled_at: null as null }, { scheduled_at: { lte: nowDate } }] },
        ...(topicTags ? [{ OR: topicTags.map((tag: string) => ({ content: { contains: tag } })) }] : []),
      ],
    };

    // Stage 1: Candidate pool — 4 buckets in parallel
    // For Bucket D (FOF), we keep raw like objects to build a count map
    const [socialPosts, affinityPosts, viralPosts, fofLikesRaw] = await Promise.all([
      followedIds.length > 0
        ? prisma.post.findMany({
            where: { ...basePostWhere, user_id: { in: followedIds }, created_at: { gte: sevenDaysAgo } },
            include: baseInclude,
            orderBy: { created_at: 'desc' },
            take: socialLimit,
          })
        : Promise.resolve([]),

      topTags.length > 0
        ? prisma.post.findMany({
            where: {
              id: { notIn: excludeIds },
              OR: topTags.map(tag => ({ content: { contains: tag } })),
              created_at: { gte: sevenDaysAgo },
              scheduled_at: { equals: null as null },
            },
            include: baseInclude,
            take: 60,
          })
        : Promise.resolve([]),

      prisma.post.findMany({
        where: { ...basePostWhere, created_at: { gte: sixHoursAgo } },
        include: baseInclude,
        orderBy: { likes_count: 'desc' },
        take: viralLimit,
      }),

      // Feature 5 — return raw likes for graduated mutual proof counting
      followedIds.length > 0
        ? prisma.like.findMany({
            where: { user_id: { in: followedIds }, created_at: { gte: fortyEightHoursAgo } },
            select: { post_id: true },
            take: fofLimit * 3,
          })
        : Promise.resolve([] as { post_id: number }[]),
    ]);

    // Feature 5: build mutual count map
    const fofCountMap: Record<number, number> = {};
    for (const l of fofLikesRaw as { post_id: number }[]) {
      fofCountMap[l.post_id] = (fofCountMap[l.post_id] ?? 0) + 1;
    }
    const fofPostIds = [...new Set((fofLikesRaw as { post_id: number }[]).map(l => l.post_id))].slice(0, fofLimit);
    const fofPostIdSet = new Set<number>(fofPostIds);

    const fofPosts = fofPostIds.length > 0
      ? await prisma.post.findMany({ where: { id: { in: fofPostIds, notIn: excludeIds } }, include: baseInclude, take: fofLimit })
      : [];

    // Bucket 5: Behavioral peer pool (collaborative filtering)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let peerPosts: any[] = [];
    if (me) {
      const sevenDaysAgo2 = new Date(Date.now() - 7 * 24 * 3600000);
      const oneDayAgo = new Date(Date.now() - 24 * 3600000);
      const myLikedIds = await prisma.like.findMany({
        where: { user_id: me.id, created_at: { gte: sevenDaysAgo2 } },
        select: { post_id: true }, take: 100,
      }).then((ls: { post_id: number }[]) => ls.map((l: { post_id: number }) => l.post_id));
      if (myLikedIds.length > 0) {
        const peerLikers = await prisma.like.findMany({
          where: { post_id: { in: myLikedIds }, user_id: { not: me.id } },
          select: { user_id: true }, take: 500,
        });
        const peerOverlap: Record<number, number> = {};
        for (const l of peerLikers as { user_id: number }[])
          peerOverlap[l.user_id] = (peerOverlap[l.user_id] ?? 0) + 1;
        const qualifiedPeerIds = Object.entries(peerOverlap)
          .filter(([, c]) => c >= 2).map(([id]) => Number(id)).slice(0, 50);
        if (qualifiedPeerIds.length > 0) {
          const peerRecentLikes = await prisma.like.findMany({
            where: { user_id: { in: qualifiedPeerIds }, created_at: { gte: oneDayAgo } },
            select: { post_id: true }, take: 200,
          });
          const peerPostCounts: Record<number, number> = {};
          for (const l of peerRecentLikes as { post_id: number }[])
            peerPostCounts[l.post_id] = (peerPostCounts[l.post_id] ?? 0) + 1;
          const peerPostIds = Object.entries(peerPostCounts)
            .filter(([, c]) => c >= 2).map(([id]) => Number(id)).slice(0, 30);
          if (peerPostIds.length > 0) {
            peerPosts = await prisma.post.findMany({
              where: { id: { in: peerPostIds, notIn: excludeIds } },
              include: baseInclude, take: 30,
            });
          }
        }
      }
    }
    const peerPostIdSet = new Set<number>(peerPosts.map((p: { id: number }) => p.id));

    // Merge & deduplicate
    const seenInPool = new Set<number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pool: any[] = [];
    for (const p of [...socialPosts, ...affinityPosts, ...viralPosts, ...fofPosts, ...peerPosts]) {
      if (!p || seenInPool.has(p.id)) continue;
      seenInPool.add(p.id);
      pool.push({ ...p, _isPeer: peerPostIdSet.has(p.id) });
    }

    // Creator posting frequency (spam penalty) — batch query over pool creators
    const poolCreatorIds = [...new Set(pool.map((p: { user_id: number }) => p.user_id))];
    const creatorPostFrequency = await buildCreatorPostingFrequency(poolCreatorIds, prisma);

    // Evergreen posts: old posts (>48h) still gaining new likes in last 6h
    const sixHoursAgoDate = new Date(Date.now() - 6 * 3600000);
    const evergreenLikes = pool.length > 0
      ? await prisma.like.findMany({
          where: {
            post_id: { in: pool.map((p: { id: number }) => p.id) },
            created_at: { gte: sixHoursAgoDate },
            post: { created_at: { lte: fortyEightHoursAgo } },
          },
          select: { post_id: true },
          take: 500,
        })
      : [];
    const evergreenPostIds = new Set<number>((evergreenLikes as { post_id: number }[]).map(l => l.post_id));

    // Collection save popularity — how many distinct collections each post appears in
    const collectionSaveCounts: Record<number, number> = pool.length > 0
      ? await prisma.collectionPost.groupBy({
          by: ['post_id'],
          where: { post_id: { in: pool.map((p: { id: number }) => p.id) } },
          _count: { post_id: true },
        }).then((groups: { post_id: number; _count: { post_id: number } }[]) => {
          const m: Record<number, number> = {};
          for (const g of groups) m[g.post_id] = g._count.post_id;
          return m;
        })
      : {};

    // Community post IDs — which pool posts belong to the user's communities
    const communityPostIds: Set<number> = (userCommunityIds as number[]).length > 0
      ? await prisma.communityPost.findMany({
          where: {
            community_id: { in: userCommunityIds as number[] },
            post_id: { in: pool.map((p: { id: number }) => p.id) },
          },
          select: { post_id: true },
        }).then((cps: { post_id: number }[]) => new Set(cps.map((cp: { post_id: number }) => cp.post_id)))
      : new Set<number>();

    // Trending creator set — creator with 2+ pool posts currently in viralSpikeSet
    const viralCreatorCounts: Record<number, number> = {};
    for (const p of pool) {
      if (viralSpikeSet.has(p.id))
        viralCreatorCounts[p.user_id] = (viralCreatorCounts[p.user_id] ?? 0) + 1;
    }
    const trendingCreatorSet = new Set<number>(
      Object.entries(viralCreatorCounts).filter(([, c]) => c >= 2).map(([id]) => Number(id))
    );

    // Bookmark velocity — posts being saved at accelerating rate (5-min cache)
    const bookmarkVelocitySet = await getBookmarkVelocitySet(prisma);

    // Stage 3: Multi-signal scoring
    const nowMs = Date.now();
    const topTagSet = new Set(topTags);

    const scored = pool
      .filter(p => {
        if (notIntCreatorSet.has(p.user_id)) return false;
        if (mutedUserSet.has(p.user_id)) return false;  // Feature 10
        if (mutedSet.size > 0) {
          const lower = p.content.toLowerCase();
          for (const word of mutedSet) if (lower.includes(word)) return false;
        }
        return true;
      })
      .map(p => {
        const ageHours = (nowMs - new Date(p.created_at).getTime()) / 3600000;
        const postTags = extractHashtags(p.content);
        const hashAffinityScore = topTags.reduce(
          (sum, tag) => sum + (p.content.toLowerCase().includes(tag) ? (hashWeights[tag] ?? 0) : 0), 0
        );
        const creatorAffinity = creatorWeights[p.user_id] ?? 0;
        const isFollowed = followedSet.has(p.user_id);
        const mutualCount = fofCountMap[p.id] ?? 0;

        // Feature 1 — CTR / view-count quality signal
        const views = p.view_count ?? 0;
        const ctr = p.likes_count / Math.max(views, 1);
        const ctrBoost = 1 + Math.min(ctr * 2, 0.4);
        const base = Math.log(1 + p.likes_count * 3 + p.comments_count * 5 + p.shares_count * 2 + (p.reactions?.length ?? 0) * 2 + views * 0.1) + 1;

        // Feature 2 — image richness
        let imageCount = p.image_url ? 1 : 0;
        try { imageCount += JSON.parse(p.image_urls || '[]').length; } catch { /* empty */ }
        const mediaBoost = imageCount > 0 ? 1 + Math.min(imageCount * 0.05, 0.15) : 1.0;

        // Feature 3 — format affinity
        const favFormatScore = formatWeights[p.post_type] ?? 0;
        const formatBoost = 1 + Math.min(favFormatScore * 0.12, 0.12);

        // Feature 4 — trending hashtag velocity
        const hasTrendingTag = postTags.some(t => trendingMap[t] === 'rising');
        const trendBoost = hasTrendingTag ? 1.25 : 1.0;
        const risingTag = postTags.find(t => trendingMap[t] === 'rising');

        const freshness = 1 / Math.pow(1 + ageHours / 12, 0.6);

        // Feature 5 — graduated mutual social proof (affinity-scaled for direct follows)
        const social = isFollowed
          ? 1.6 + Math.min(creatorAffinity * 0.4, 0.6)
          : mutualCount >= 3 ? 1.8
          : mutualCount === 2 ? 1.55
          : mutualCount === 1 ? 1.3
          : 1.0;

        const content = 1 + Math.min(hashAffinityScore * 0.15, 0.6);
        const creator = 1 + Math.min(creatorAffinity * 0.1, 0.4);

        // Follower-normalized engagement quality (replaces flat verified flag)
        const followers = p.user?.followers_count ?? 0;
        const followerAdjustedQuality = Math.min(
          1 + (p.likes_count + p.comments_count * 2) / Math.max(followers, 50) * 0.5, 1.6
        );
        const quality = p.user?.is_verified
          ? Math.max(followerAdjustedQuality, 1.15)
          : followerAdjustedQuality;
        const velocityLikes = ageHours < 6 ? p.likes_count : 0;
        const velocity = Math.min(1 + velocityLikes * 0.02, 1.4);

        // Feature 9 — dwell time boost
        const avgDwell = dwellWeights[p.user_id] ?? 0;
        const dwellBoost = 1 + Math.min(avgDwell / 30 * 0.2, 0.4);

        // Negative skip penalty
        const skipScore = (skipWeights as Record<number, number>)[p.user_id] ?? 0;
        const skipPenalty = 1 / (1 + skipScore * 0.25);

        // Engagement reciprocity boost (creator engaged with my posts)
        const reciprocityBoost = reciprocalCreatorIds.has(p.user_id) ? 1.35 : 1.0;

        // Time-of-day topic boost
        const timeSlotScore = postTags.reduce(
          (sum: number, tag: string) => sum + ((timeSlotWeights as Record<string, number>)[tag] ?? 0), 0
        );
        const timeBoost = 1 + Math.min(timeSlotScore * 0.1, 0.2);

        // Viral spike — any-age post surging right now
        const viralSpikeBoost = viralSpikeSet.has(p.id) ? 1.5 : 1.0;

        // New follow recency boost (fades over 7 days)
        const followAgeDays = recentFollowMap.get(p.user_id);
        const newFollowBoost = followAgeDays !== undefined
          ? 1.0 + (1 - followAgeDays / 7) * 0.4
          : 1.0;

        // Creator spam penalty
        const posts24h = creatorPostFrequency[p.user_id] ?? 0;
        const spamPenalty = posts24h > 10 ? 0.6 : posts24h > 5 ? 0.8 : 1.0;

        // Evergreen content rescue (old posts still gaining traction)
        const evergreenBoost = evergreenPostIds.has(p.id) ? 1.25 : 1.0;

        // Session context carry-forward (boost topics seen in last 10 impressions)
        const sessionTagOverlap = postTags.reduce(
          (sum: number, tag: string) => sum + ((sessionTagCounts as Record<string, number>)[tag] ?? 0), 0
        );
        const sessionBoost = 1 + Math.min(sessionTagOverlap * 0.08, 0.25);

        // Comment quality signal (longer comments = more engaged audience)
        const commentQualityBoost = 1 + Math.min(((p as { avg_comment_length?: number }).avg_comment_length ?? 0) / 200 * 0.15, 0.15);

        // Feature R2-1 — active poll engagement opportunity
        const hasPoll = !!(p as { post_poll?: { ends_at: string | Date; votes?: { user_id: number }[] } | null }).post_poll;
        const pollData = hasPoll ? (p as { post_poll: { ends_at: string | Date; votes?: { user_id: number }[] } }).post_poll : null;
        const pollActive = pollData ? new Date(pollData.ends_at) > new Date(nowMs) : false;
        const userVotedPoll = pollData ? (pollData.votes ?? []).some((v: { user_id: number }) => v.user_id === meId) : false;
        const pollBoost = pollActive && !userVotedPoll ? 1.2 : 1.0;

        // Feature R2-2 — reaction type diversity (broad emotional resonance)
        const uniqueReactionTypes = new Set(((p as { reactions?: { emoji: string }[] }).reactions ?? []).map((r: { emoji: string }) => r.emoji)).size;
        const reactionDiversityBoost = 1 + Math.min(uniqueReactionTypes / 6 * 0.12, 0.12);

        // Feature R2-3 — thread affinity (user engaged with another post in this thread)
        const postThreadId = (p as { thread_id?: number | null }).thread_id ?? null;
        const threadAffinityBoost = postThreadId && (engagedThreadIds as Set<number>).has(postThreadId) ? 1.3 : 1.0;

        // Feature R2-4 — community membership amplification
        const communityBoost = communityPostIds.has(p.id) ? 1.25 : 1.0;

        // Feature R2-5 — content length preference
        const postLength = (p.content ?? '').length;
        const postLengthBucket: 'short' | 'medium' | 'long' = postLength < 100 ? 'short' : postLength < 300 ? 'medium' : 'long';
        const lengthBoost = postLengthBucket === (contentLengthPref as 'short' | 'medium' | 'long') ? 1.12 : 1.0;

        // Feature R2-6 — collection save popularity
        const collectionSaves = collectionSaveCounts[p.id] ?? 0;
        const collectionBoost = 1 + Math.min(collectionSaves * 0.1, 0.3);

        // Feature R2-7 — location affinity
        const myLocation = ((me as { location?: string } | null)?.location ?? '').toLowerCase().trim();
        const postLocation = ((p as { location_name?: string }).location_name ?? '').toLowerCase().trim();
        const locationBoost = myLocation && postLocation && postLocation.includes(myLocation) ? 1.3 : 1.0;

        // Feature R2-8 — creator emergence signal (new accounts with high engagement rate)
        const creatorJoinedAt = (p.user as { created_at?: string | Date } | null)?.created_at
          ? new Date((p.user as { created_at: string | Date }).created_at) : null;
        const creatorAgeMonths = creatorJoinedAt ? (nowMs - creatorJoinedAt.getTime()) / (30 * 24 * 3600000) : 999;
        const emergenceBoost = creatorAgeMonths < 3 && followerAdjustedQuality > 1.3 ? 1.2 : 1.0;

        // Feature R2-9 — trending creator (2+ of their posts in viralSpikeSet)
        const trendingCreatorBoost = trendingCreatorSet.has(p.user_id) ? 1.35 : 1.0;

        // Feature R2-11 — bookmark velocity (posts being saved at accelerating rate)
        const bookmarkVelocityBoost = bookmarkVelocitySet.has(p.id) ? 1.3 : 1.0;

        const score = base * social * content * creator * freshness * quality
          * velocity * ctrBoost * mediaBoost * formatBoost * trendBoost * dwellBoost
          * skipPenalty * reciprocityBoost * timeBoost * viralSpikeBoost
          * newFollowBoost * spamPenalty * evergreenBoost * sessionBoost * commentQualityBoost
          * pollBoost * reactionDiversityBoost * threadAffinityBoost * communityBoost
          * lengthBoost * collectionBoost * locationBoost * emergenceBoost
          * trendingCreatorBoost * bookmarkVelocityBoost;

        // "Why am I seeing this?" reason
        const reason: string =
          (p as { _isPeer?: boolean })._isPeer               ? 'Liked by people with similar interests' :
          communityPostIds.has(p.id)                         ? 'From your community' :
          postThreadId && (engagedThreadIds as Set<number>).has(postThreadId) ? "Thread you're following" :
          isFollowed                                          ? 'From someone you follow' :
          mutualCount >= 2                                   ? `Liked by ${mutualCount} people you follow` :
          reciprocalCreatorIds.has(p.user_id)                ? 'Someone who engages with you' :
          evergreenPostIds.has(p.id)                         ? 'Still gaining traction' :
          bookmarkVelocitySet.has(p.id)                      ? 'People are saving this' :
          risingTag                                          ? `Trending in ${risingTag}` :
          hashAffinityScore > 1                              ? `Based on your interest in ${topTags[0] ?? ''}` :
          ageHours < 6 && p.likes_count > 20                 ? 'Rising fast' :
                                                               'Recommended for you';

        return { p, score, reason, isDiscovery: !isFollowed, isOutsideInterests: !postTags.some(t => topTagSet.has(t)) };
      });

    scored.sort((a, b) => b.score - a.score);

    // Stage 4: Diversity filter — max 3 per creator, max 4 per topic cluster
    const creatorCount: Record<number, number> = {};
    const clusterCount: Record<string, number> = {};
    const filtered: typeof scored = [];

    for (const item of scored) {
      if ((creatorCount[item.p.user_id] ?? 0) >= 3) continue;
      const cluster = getPostCluster(item.p.content);
      if (cluster && (clusterCount[cluster] ?? 0) >= 4) continue;
      creatorCount[item.p.user_id] = (creatorCount[item.p.user_id] ?? 0) + 1;
      if (cluster) clusterCount[cluster] = (clusterCount[cluster] ?? 0) + 1;
      filtered.push(item);
      if (filtered.length >= 120) break;
    }

    // Feature 8 — anti-filter-bubble serendipity (every 10th slot)
    const serendipityPool = pool
      .filter(p => extractHashtags(p.content).every(t => !topTagSet.has(t)) && p.likes_count > 2)
      .sort((a, b) => b.likes_count - a.likes_count);
    let sIdx = 0;
    const withSerendipity = filtered.map((item, i) => {
      if ((i + 1) % 10 === 0 && serendipityPool[sIdx]) {
        const sp = serendipityPool[sIdx++];
        return { p: sp, score: 0, reason: 'Something new for you', isDiscovery: true, isOutsideInterests: true };
      }
      return item;
    });

    const page_items = withSerendipity.slice(skip, skip + perPage);
    return NextResponse.json({
      posts: page_items.map(({ p, reason }) => serializePostFull(p, meId, reason)),
      has_next: skip + perPage < withSerendipity.length,
      total: withSerendipity.length,
    });
  }

  const now = new Date();
  const where = {
    id: { notIn: notInterestedIds },
    ...(postType ? { post_type: postType } : {}),
    ...(personaFilter ? { persona: personaFilter } : {}),
    OR: [{ scheduled_at: null as null }, { scheduled_at: { lte: now } }],
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({ where, include: baseInclude, orderBy: { created_at: 'desc' }, skip, take: perPage }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map((p: any) => serializePostFull(p, meId)),
    has_next: skip + perPage < total,
    total,
  });
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const data = await req.json();
  const reactionPollJson = (() => {
    if (!data.reaction_poll) return '';
    const opts = (data.reaction_poll.options as { label: string; emoji: string }[])
      ?.filter(o => o.label?.trim())
      .slice(0, 5);
    if (!opts || opts.length < 2) return '';
    return JSON.stringify({ question: data.reaction_poll.question || 'How does this make you feel?', options: opts });
  })();

  const post = await prisma.post.create({
    data: {
      user_id: me.id,
      content: data.content || '',
      image_url: data.image_url || '',
      alt_text: data.alt_text || '',
      post_type: data.post_type || 'post',
      visibility: data.visibility || 'everyone',
      is_anonymous: !!data.is_anonymous,
      reaction_poll: reactionPollJson,
      persona: data.persona || '',
      ...(data.scheduled_at ? { scheduled_at: new Date(data.scheduled_at) } : {}),
      ...(data.locked_until ? { locked_until: new Date(data.locked_until) } : {}),
      ...(data.commitment_deadline ? { commitment_deadline: new Date(data.commitment_deadline) } : {}),
      ...(data.live_widget ? { live_widget: typeof data.live_widget === 'string' ? data.live_widget : JSON.stringify(data.live_widget) } : {}),
    },
  });

  if (data.poll && data.poll.question && Array.isArray(data.poll.options) && data.poll.options.length >= 2) {
    const durationHours = Number(data.poll.duration_hours) || 24;
    await prisma.postPoll.create({
      data: {
        post_id: post.id,
        question: data.poll.question.trim(),
        options: JSON.stringify(data.poll.options.filter((o: string) => o.trim())),
        ends_at: new Date(Date.now() + durationHours * 3600000),
      },
    });
  }

  const mentions = (data.content || '').match(/@(\w+)/g)?.map((m: string) => m.slice(1)) ?? [];
  for (const username of mentions) {
    const mentioned = await prisma.user.findUnique({ where: { username } });
    if (mentioned && mentioned.id !== me.id) {
      await prisma.notification.create({
        data: { user_id: mentioned.id, actor_id: me.id, notif_type: 'mention', content: `${me.name} mentioned you in a post` },
      });
    }
  }

  const finalPost = await prisma.post.findUnique({
    where: { id: post.id },
    include: { user: true, collab_user: true, ref_post: { include: { user: true } }, reactions: true, post_poll: { include: { votes: true } }, reaction_poll_votes: true, post_autopsy: true },
  });

  return NextResponse.json({ ...serializePostFull(finalPost, me.id) }, { status: 201 });
}
