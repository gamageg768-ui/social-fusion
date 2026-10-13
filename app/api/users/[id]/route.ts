import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const userId = Number(params.id);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let is_following = false;
  let follow_requested = false;

  if (me && me.id !== userId) {
    const [follow, request] = await Promise.all([
      prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: me.id, following_id: userId } } }),
      prisma.followRequest.findUnique({ where: { requester_id_target_id: { requester_id: me.id, target_id: userId } } }),
    ]);
    is_following = !!follow;
    follow_requested = !!request && request.status === 'pending';
  }

  return NextResponse.json({ ...serializeUser(user), is_following, follow_requested });
}
