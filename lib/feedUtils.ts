export const TOPIC_CLUSTERS: Record<string, string[]> = {
  tech:    ['#webdev', '#coding', '#ai', '#programming', '#opensource', '#nextjs', '#javascript', '#typescript', '#reactjs'],
  art:     ['#photography', '#design', '#aiart', '#illustration', '#film', '#art', '#digitalart'],
  health:  ['#fitness', '#fitnessgoals', '#wellness', '#mentalhealth', '#health', '#nutrition'],
  travel:  ['#travel', '#travelvibes', '#adventure', '#wanderlust', '#explore'],
  music:   ['#music', '#musicproduction', '#hiphop', '#indiemusic', '#producer'],
  startup: ['#startup', '#entrepreneur', '#saas', '#buildinpublic', '#indiehacker'],
};

export function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z]\w*)/g);
  return matches ? [...new Set(matches.map(t => t.toLowerCase()))] : [];
}

// ─── Trending map ───────────────────────────────────────────────────────────

let _trendingCache: { data: Record<string, 'rising' | 'stable' | 'falling'>; ts: number } | null = null;
const TREND_TTL = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTrendingMap(prisma: any): Promise<Record<string, 'rising' | 'stable' | 'falling'>> {
  if (_trendingCache && Date.now() - _trendingCache.ts < TREND_TTL) {
    return _trendingCache.data;
  }
  const oneDayAgo = new Date(Date.now() - 24 * 3600000);
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000);

  const [todayPosts, yesterdayPosts] = await Promise.all([
    prisma.post.findMany({ where: { created_at: { gte: oneDayAgo }, content: { not: '' } }, select: { content: true }, take: 1000 }),
    prisma.post.findMany({ where: { created_at: { gte: twoDaysAgo, lt: oneDayAgo }, content: { not: '' } }, select: { content: true }, take: 1000 }),
  ]);

  const todayCounts: Record<string, number> = {};
  const yesterdayCounts: Record<string, number> = {};
  for (const p of todayPosts) for (const t of extractHashtags(p.content)) todayCounts[t] = (todayCounts[t] ?? 0) + 1;
  for (const p of yesterdayPosts) for (const t of extractHashtags(p.content)) yesterdayCounts[t] = (yesterdayCounts[t] ?? 0) + 1;

  const map: Record<string, 'rising' | 'stable' | 'falling'> = {};
  for (const [tag, count] of Object.entries(todayCounts)) {
    const y = yesterdayCounts[tag] ?? 0;
    map[tag] = y === 0 || count > y * 1.5 ? 'rising' : count < y * 0.7 ? 'falling' : 'stable';
  }
  _trendingCache = { data: map, ts: Date.now() };
  return map;
}

// ─── Hashtag weights (3-horizon blending) ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchHashtagsForWindow(userId: number, fromDaysAgo: number, toDaysAgo: number | null, prisma: any): Promise<Record<string, number>> {
  const fromDate = new Date(Date.now() - fromDaysAgo * 24 * 3600000);
  const toDate = toDaysAgo ? new Date(Date.now() - toDaysAgo * 24 * 3600000) : new Date();
  const dateFilter = toDaysAgo
    ? { gte: fromDate, lt: toDate }
    : { gte: fromDate };

  const [likes, bookmarks, comments] = await Promise.all([
    prisma.like.findMany({ where: { user_id: userId, created_at: dateFilter }, select: { post: { select: { content: true } } }, take: 100 }),
    prisma.bookmark.findMany({ where: { user_id: userId, created_at: dateFilter }, select: { post: { select: { content: true } } }, take: 100 }),
    prisma.comment.findMany({ where: { user_id: userId, created_at: dateFilter }, select: { post: { select: { content: true } } }, take: 100 }),
  ]);

  const weights: Record<string, number> = {};
  const add = (content: string | null | undefined, w: number) => {
    if (!content) return;
    for (const t of extractHashtags(content)) weights[t] = (weights[t] ?? 0) + w;
  };
  for (const l of likes) add(l.post?.content, 1.0);
  for (const b of bookmarks) add(b.post?.content, 2.0);
  for (const c of comments) add(c.post?.content, 1.5);
  return weights;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildHashtagWeights(userId: number, prisma: any): Promise<Record<string, number>> {
  const [w7, w30, w90] = await Promise.all([
    fetchHashtagsForWindow(userId, 7, null, prisma),      // last 7 days (weight 0.5)
    fetchHashtagsForWindow(userId, 30, 7, prisma),        // 7-30 days ago (weight 0.3)
    fetchHashtagsForWindow(userId, 90, 30, prisma),       // 30-90 days ago (weight 0.2)
  ]);

  const merged: Record<string, number> = {};
  const blend = (w: Record<string, number>, factor: number) => {
    for (const [tag, score] of Object.entries(w)) merged[tag] = (merged[tag] ?? 0) + score * factor;
  };
  blend(w7, 0.5);
  blend(w30, 0.3);
  blend(w90, 0.2);
  return merged;
}

// ─── Creator weights ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildCreatorWeights(userId: number, prisma: any): Promise<Record<number, number>> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);

  const [likes, bookmarks, comments] = await Promise.all([
    prisma.like.findMany({ where: { user_id: userId, created_at: { gte: sixtyDaysAgo } }, select: { post: { select: { user_id: true } }, created_at: true }, take: 200 }),
    prisma.bookmark.findMany({ where: { user_id: userId, created_at: { gte: sixtyDaysAgo } }, select: { post: { select: { user_id: true } }, created_at: true }, take: 100 }),
    prisma.comment.findMany({ where: { user_id: userId, created_at: { gte: sixtyDaysAgo } }, select: { post: { select: { user_id: true } }, created_at: true }, take: 100 }),
  ]);

  const weights: Record<number, number> = {};
  const add = (id: number | null | undefined, w: number, date: Date) => {
    if (!id) return;
    weights[id] = (weights[id] ?? 0) + w * (date < thirtyDaysAgo ? 0.5 : 1.0);
  };
  for (const l of likes) add(l.post?.user_id, 1.0, new Date(l.created_at));
  for (const b of bookmarks) add(b.post?.user_id, 2.0, new Date(b.created_at));
  for (const c of comments) add(c.post?.user_id, 3.0, new Date(c.created_at));
  return weights;
}

// ─── Format (post_type) affinity ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildFormatWeights(userId: number, prisma: any): Promise<Record<string, number>> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600000);
  const likes = await prisma.like.findMany({
    where: { user_id: userId, created_at: { gte: sixtyDaysAgo } },
    select: { post: { select: { post_type: true } } },
    take: 100,
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const l of likes) {
    const t = l.post?.post_type ?? 'post';
    counts[t] = (counts[t] ?? 0) + 1;
    total++;
  }
  if (total === 0) return {};
  // Normalize to proportions
  return Object.fromEntries(Object.entries(counts).map(([t, n]) => [t, n / total]));
}

// ─── Dwell time weights (per creator) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildDwellWeights(userId: number, prisma: any): Promise<Record<number, number>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const dwells = await prisma.postDwellTime.findMany({
    where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
    select: { seconds: true, post: { select: { user_id: true } } },
    take: 200,
  });

  const totals: Record<number, number> = {};
  const counts: Record<number, number> = {};
  for (const d of dwells) {
    const cid = d.post?.user_id;
    if (!cid) continue;
    totals[cid] = (totals[cid] ?? 0) + d.seconds;
    counts[cid] = (counts[cid] ?? 0) + 1;
  }
  return Object.fromEntries(Object.keys(totals).map(id => [id, totals[+id] / counts[+id]]));
}

// ─── Skip weights (negative signal per creator) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildSkipWeights(userId: number, prisma: any): Promise<Record<number, number>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const skips = await prisma.postSkip.findMany({
    where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
    select: { creator_id: true },
    take: 500,
  });
  const counts: Record<number, number> = {};
  for (const s of skips) counts[s.creator_id] = (counts[s.creator_id] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).map(([id, n]) => [Number(id), n / 10]));
}

// ─── Time-of-day slot weights ─────────────────────────────────────────────────

export function getTimeSlotBucket(): number {
  const h = new Date().getHours();
  if (h <= 5)  return 0; // night
  if (h <= 11) return 1; // morning
  if (h <= 17) return 2; // afternoon
  return 3;               // evening
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildTimeSlotWeights(userId: number, prisma: any): Promise<Record<string, number>> {
  const slotRanges: [number, number][] = [[0, 5], [6, 11], [12, 17], [18, 23]];
  const [lo, hi] = slotRanges[getTimeSlotBucket()];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600000);
  const likes = await prisma.like.findMany({
    where: { user_id: userId, created_at: { gte: fourteenDaysAgo } },
    select: { post: { select: { content: true } }, created_at: true },
    take: 300,
  });
  const weights: Record<string, number> = {};
  for (const l of likes) {
    const hour = new Date(l.created_at).getHours();
    if (hour < lo || hour > hi || !l.post?.content) continue;
    for (const tag of extractHashtags(l.post.content))
      weights[tag] = (weights[tag] ?? 0) + 1;
  }
  const maxVal = Math.max(...Object.values(weights), 1);
  return Object.fromEntries(Object.entries(weights).map(([t, n]) => [t, n / maxVal]));
}

// ─── Viral spike set (any-age posts surging in engagement) ───────────────────

let _velocityCache: { data: Set<number>; ts: number } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getViralSpikeSet(prisma: any): Promise<Set<number>> {
  if (_velocityCache && Date.now() - _velocityCache.ts < TREND_TTL) return _velocityCache.data;
  const twoHoursAgo  = new Date(Date.now() - 2 * 3600000);
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000);
  const [recent, older] = await Promise.all([
    prisma.like.groupBy({ by: ['post_id'], where: { created_at: { gte: twoHoursAgo } },              _count: { post_id: true }, take: 200 }),
    prisma.like.groupBy({ by: ['post_id'], where: { created_at: { gte: fourHoursAgo, lt: twoHoursAgo } }, _count: { post_id: true }, take: 200 }),
  ]);
  const olderMap: Record<number, number> = {};
  for (const r of older) olderMap[r.post_id] = r._count.post_id;
  const spikeSet = new Set<number>();
  for (const r of recent) {
    const n = r._count.post_id, o = olderMap[r.post_id] ?? 0;
    if (n >= 2 && (o === 0 || n >= o * 2)) spikeSet.add(r.post_id);
  }
  _velocityCache = { data: spikeSet, ts: Date.now() };
  return spikeSet;
}

// ─── Creator posting frequency (anti-spam) ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildCreatorPostingFrequency(creatorIds: number[], prisma: any): Promise<Record<number, number>> {
  if (creatorIds.length === 0) return {};
  const oneDayAgo = new Date(Date.now() - 24 * 3600000);
  const grouped = await prisma.post.groupBy({
    by: ['user_id'],
    where: { user_id: { in: creatorIds }, created_at: { gte: oneDayAgo } },
    _count: { id: true },
  });
  const result: Record<number, number> = {};
  for (const g of grouped) result[g.user_id] = g._count.id;
  return result;
}

// ─── Content length preference ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildContentLengthPreference(userId: number, prisma: any): Promise<'short' | 'medium' | 'long'> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600000);
  const likes = await prisma.like.findMany({
    where: { user_id: userId, created_at: { gte: sixtyDaysAgo } },
    select: { post: { select: { content: true } } },
    take: 200,
  });
  if (likes.length === 0) return 'medium';
  const avgLen = likes.reduce(
    (s: number, l: { post: { content: string } | null }) => s + (l.post?.content?.length ?? 0), 0
  ) / likes.length;
  return avgLen < 100 ? 'short' : avgLen < 300 ? 'medium' : 'long';
}

// ─── Bookmark velocity set ────────────────────────────────────────────────────

let _bookmarkVelocityCache: { data: Set<number>; ts: number } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBookmarkVelocitySet(prisma: any): Promise<Set<number>> {
  if (_bookmarkVelocityCache && Date.now() - _bookmarkVelocityCache.ts < TREND_TTL)
    return _bookmarkVelocityCache.data;
  const twoHoursAgo  = new Date(Date.now() - 2 * 3600000);
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000);
  const [recent, older] = await Promise.all([
    prisma.bookmark.groupBy({ by: ['post_id'], where: { created_at: { gte: twoHoursAgo } },               _count: { post_id: true }, take: 200 }),
    prisma.bookmark.groupBy({ by: ['post_id'], where: { created_at: { gte: fourHoursAgo, lt: twoHoursAgo } }, _count: { post_id: true }, take: 200 }),
  ]);
  const olderMap: Record<number, number> = {};
  for (const r of older) olderMap[r.post_id] = r._count.post_id;
  const bookmarkSpeedSet = new Set<number>();
  for (const r of recent) {
    const n = r._count.post_id, o = olderMap[r.post_id] ?? 0;
    if (n >= 2 && (o === 0 || n >= o * 2)) bookmarkSpeedSet.add(r.post_id);
  }
  _bookmarkVelocityCache = { data: bookmarkSpeedSet, ts: Date.now() };
  return bookmarkSpeedSet;
}
