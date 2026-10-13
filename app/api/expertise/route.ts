import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const userId = Number(req.nextUrl.searchParams.get('user_id') || '0');

  const claims = await prisma.expertiseClaim.findMany({
    where: { user_id: userId || (me?.id ?? -1) },
    include: { votes: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(claims.map((c: { id: number; user_id: number; topic: string; created_at: Date; votes: { voter_id: number }[] }) => ({
    id: c.id,
    user_id: c.user_id,
    topic: c.topic,
    created_at: c.created_at.toISOString(),
    vote_count: c.votes.length,
    my_vote: me ? c.votes.some((v: { voter_id: number }) => v.voter_id === me.id) : false,
  })));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { topic } = await req.json();
  if (!topic?.trim()) return NextResponse.json({ error: 'Topic required' }, { status: 400 });

  const existing = await prisma.expertiseClaim.findUnique({
    where: { user_id_topic: { user_id: me.id, topic: topic.trim() } },
  });
  if (existing) return NextResponse.json({ error: 'Already claimed' }, { status: 409 });

  const claim = await prisma.expertiseClaim.create({
    data: { user_id: me.id, topic: topic.trim() },
    include: { votes: true },
  });

  return NextResponse.json({
    id: claim.id,
    user_id: claim.user_id,
    topic: claim.topic,
    created_at: claim.created_at.toISOString(),
    vote_count: 0,
    my_vote: false,
  }, { status: 201 });
}
