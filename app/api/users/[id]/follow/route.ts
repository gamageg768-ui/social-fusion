import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const targetId = Number(params.id);
  if (targetId === me.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check if already following
  const existing = await prisma.follow.findUnique({
    where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } } });
    await Promise.all([
      prisma.user.update({ where: { id: targetId }, data: { followers_count: { decrement: 1 } } }),
      prisma.user.update({ where: { id: me.id }, data: { following_count: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ following: false, requested: false });
  }

  // Check if already sent a follow request
  const existingRequest = await prisma.followRequest.findUnique({
    where: { requester_id_target_id: { requester_id: me.id, target_id: targetId } },
  });

  if (existingRequest) {
    // Cancel the request
    await prisma.followRequest.delete({ where: { id: existingRequest.id } });
    return NextResponse.json({ following: false, requested: false });
  }

  // Private account: send follow request
  if (target.is_private) {
    await prisma.followRequest.create({ data: { requester_id: me.id, target_id: targetId } });
    await prisma.notification.create({
      data: { user_id: targetId, actor_id: me.id, notif_type: 'follow_request', content: `${me.name} requested to follow you` },
    });
    return NextResponse.json({ following: false, requested: true });
  }

  // Public account: follow directly
  await prisma.follow.create({ data: { follower_id: me.id, following_id: targetId } });
  await Promise.all([
    prisma.user.update({ where: { id: targetId }, data: { followers_count: { increment: 1 } } }),
    prisma.user.update({ where: { id: me.id }, data: { following_count: { increment: 1 } } }),
    prisma.notification.create({
      data: { user_id: targetId, actor_id: me.id, notif_type: 'follow', content: `${me.name} started following you` },
    }),
  ]);

  return NextResponse.json({ following: true, requested: false });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ following: false, requested: false });

  const targetId = Number(params.id);
  const [follow, request] = await Promise.all([
    prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } } }),
    prisma.followRequest.findUnique({ where: { requester_id_target_id: { requester_id: me.id, target_id: targetId } } }),
  ]);

  return NextResponse.json({ following: !!follow, requested: !!request && request.status === 'pending' });
}
