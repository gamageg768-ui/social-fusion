import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pollId = Number(params.id);
  const { option_idx } = await req.json();

  await prisma.pollVote.upsert({
    where: { poll_id_user_id: { poll_id: pollId, user_id: me.id } },
    update: { option_idx: Number(option_idx) },
    create: { poll_id: pollId, user_id: me.id, option_idx: Number(option_idx) },
  });

  const votes = await prisma.pollVote.findMany({ where: { poll_id: pollId } });
  return NextResponse.json({ votes });
}
