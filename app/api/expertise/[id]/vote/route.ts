import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const claimId = Number(params.id);

  const existing = await prisma.expertiseVote.findUnique({
    where: { claim_id_voter_id: { claim_id: claimId, voter_id: me.id } },
  });

  if (existing) {
    await prisma.expertiseVote.delete({ where: { id: existing.id } });
  } else {
    await prisma.expertiseVote.create({ data: { claim_id: claimId, voter_id: me.id } });
  }

  const count = await prisma.expertiseVote.count({ where: { claim_id: claimId } });
  return NextResponse.json({ vote_count: count, my_vote: !existing });
}
