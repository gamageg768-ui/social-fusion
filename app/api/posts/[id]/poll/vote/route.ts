import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = Number(params.id);
  const { option_idx } = await req.json().catch(() => ({}));

  const poll = await prisma.postPoll.findUnique({ where: { post_id: postId } });
  if (!poll) return NextResponse.json({ error: 'No poll found' }, { status: 404 });
  if (new Date(poll.ends_at) < new Date()) return NextResponse.json({ error: 'Poll ended' }, { status: 400 });

  await prisma.postPollVote.upsert({
    where: { poll_id_user_id: { poll_id: poll.id, user_id: me.id } },
    update: { option_idx: Number(option_idx) },
    create: { poll_id: poll.id, user_id: me.id, option_idx: Number(option_idx) },
  });

  const votes = await prisma.postPollVote.findMany({ where: { poll_id: poll.id } });
  return NextResponse.json({ votes, my_vote: Number(option_idx) });
}
