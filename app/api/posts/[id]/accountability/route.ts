import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const postId = Number(params.id);

  const votes = await prisma.accountabilityVote.findMany({ where: { post_id: postId } });
  const kept = votes.filter((v: { kept: boolean }) => v.kept).length;
  const missed = votes.filter((v: { kept: boolean }) => !v.kept).length;
  const myVote = me ? votes.find((v: { user_id: number; kept: boolean }) => v.user_id === me.id) : null;

  return NextResponse.json({ kept, missed, my_vote: myVote ? myVote.kept : null });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const { kept } = await req.json();

  await prisma.accountabilityVote.upsert({
    where: { post_id_user_id: { post_id: postId, user_id: me.id } },
    create: { post_id: postId, user_id: me.id, kept: !!kept },
    update: { kept: !!kept },
  });

  const votes = await prisma.accountabilityVote.findMany({ where: { post_id: postId } });
  return NextResponse.json({
    kept: votes.filter((v: { kept: boolean }) => v.kept).length,
    missed: votes.filter((v: { kept: boolean }) => !v.kept).length,
    my_vote: !!kept,
  });
}
