import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const { option_idx } = await req.json();

  const existing = await prisma.postReactionVote.findUnique({
    where: { post_id_user_id: { post_id: postId, user_id: me.id } },
  });

  if (existing) {
    if (existing.option_idx === option_idx) {
      await prisma.postReactionVote.delete({
        where: { post_id_user_id: { post_id: postId, user_id: me.id } },
      });
    } else {
      await prisma.postReactionVote.update({
        where: { post_id_user_id: { post_id: postId, user_id: me.id } },
        data: { option_idx },
      });
    }
  } else {
    await prisma.postReactionVote.create({
      data: { post_id: postId, user_id: me.id, option_idx },
    });
  }

  const [votes, myVote] = await Promise.all([
    prisma.postReactionVote.findMany({ where: { post_id: postId } }),
    prisma.postReactionVote.findUnique({ where: { post_id_user_id: { post_id: postId, user_id: me.id } } }),
  ]);

  return NextResponse.json({ votes, my_vote: myVote?.option_idx ?? null });
}
