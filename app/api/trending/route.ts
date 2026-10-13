import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getTrendingMap } from '@/lib/feedUtils';

export async function GET() {
  const prisma = await ensureDb();
  const trendingMap = await getTrendingMap(prisma);

  // Count occurrences from last 24h to get post counts
  const oneDayAgo = new Date(Date.now() - 24 * 3600000);
  const posts = await prisma.post.findMany({
    where: { created_at: { gte: oneDayAgo }, content: { not: '' } },
    select: { content: true },
    take: 1000,
  });

  const counts: Record<string, number> = {};
  for (const p of posts) {
    const { extractHashtags } = await import('@/lib/feedUtils');
    for (const tag of extractHashtags(p.content)) counts[tag] = (counts[tag] ?? 0) + 1;
  }

  const trending = Object.entries(trendingMap)
    .filter(([tag]) => (counts[tag] ?? 0) >= 1)
    .sort((a, b) => (counts[b[0]] ?? 0) - (counts[a[0]] ?? 0))
    .slice(0, 10)
    .map(([tag, trend]) => ({ tag, count: counts[tag] ?? 0, trend }));

  return NextResponse.json({ trending });
}
