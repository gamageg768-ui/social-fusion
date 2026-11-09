import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const targetId = Number(params.id);
  if (isNaN(targetId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  if (targetId === me.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rl = checkRateLimit(`follow:${me.id}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.follow.findUnique({
      where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } },
    });

    if (existing) {
      await tx.follow.delete({ where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } } });
      await tx.user.update({ where: { id: targetId }, data: { followers_count: { decrement: 1 } } });
      await tx.user.update({ where: { id: me.id }, data: { following_count: { decrement: 1 } } });
      return { following: false, requested: false };
    }

    const existingRequest = await tx.followRequest.findUnique({
      where: { requester_id_target_id: { requester_id: me.id, target_id: targetId } },
    });

    if (existingRequest) {
      await tx.followRequest.delete({ where: { id: existingRequest.id } });
      return { following: false, requested: false };
    }

    if (target.is_private) {
      await tx.followRequest.create({ data: { requester_id: me.id, target_id: targetId } });
      await tx.notification.create({
        data: { user_id: targetId, actor_id: me.id, notif_type: 'follow_request', content: `${me.name} requested to follow you` },
      });
      return { following: false, requested: true };
    }

    await tx.follow.create({ data: { follower_id: me.id, following_id: targetId } });
    await tx.user.update({ where: { id: targetId }, data: { followers_count: { increment: 1 } } });
    await tx.user.update({ where: { id: me.id }, data: { following_count: { increment: 1 } } });
    await tx.notification.create({
      data: { user_id: targetId, actor_id: me.id, notif_type: 'follow', content: `${me.name} started following you` },
    });

    return { following: true, requested: false };
  });

  return NextResponse.json(result);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ following: false, requested: false });

  const targetId = Number(params.id);
  if (isNaN(targetId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const [follow, request] = await Promise.all([
    prisma.follow.findUnique({ where: { follower_id_following_id: { follower_id: me.id, following_id: targetId } } }),
    prisma.followRequest.findUnique({ where: { requester_id_target_id: { requester_id: me.id, target_id: targetId } } }),
  ]);

  return NextResponse.json({ following: !!follow, requested: !!request && request.status === 'pending' });
}
