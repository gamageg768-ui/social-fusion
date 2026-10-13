import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ score: 100, unique_authors: 0, total: 0 });

  const recentLikes = await prisma.like.findMany({
    where: { user_id: me.id },
    select: { post: { select: { user_id: true } } },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  const total = recentLikes.length;
  if (total === 0) return NextResponse.json({ score: 100, unique_authors: 0, total: 0 });

  const uniqueAuthors = new Set(
    recentLikes.map((l: { post: { user_id: number } | null }) => l.post?.user_id).filter(Boolean)
  ).size;

  const score = Math.round((uniqueAuthors / total) * 100);
  return NextResponse.json({ score, unique_authors: uniqueAuthors, total });
}
