import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

// GET pending follow requests for the current user
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me || me.id !== Number(params.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const requests = await prisma.followRequest.findMany({
    where: { target_id: me.id, status: 'pending' },
    include: { requester: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(
    requests.map(r => ({
      id: r.id,
      requester_id: r.requester_id,
      target_id: r.target_id,
      status: r.status,
      created_at: r.created_at.toISOString(),
      requester: serializeUser(r.requester),
    }))
  );
}

// POST to accept or reject a follow request
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me || me.id !== Number(params.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { request_id, action } = await req.json();

  const request = await prisma.followRequest.findUnique({ where: { id: Number(request_id) } });
  if (!request || request.target_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'accept') {
    await Promise.all([
      prisma.followRequest.update({ where: { id: request.id }, data: { status: 'accepted' } }),
      prisma.follow.create({ data: { follower_id: request.requester_id, following_id: me.id } }),
      prisma.user.update({ where: { id: me.id }, data: { followers_count: { increment: 1 } } }),
      prisma.user.update({ where: { id: request.requester_id }, data: { following_count: { increment: 1 } } }),
      prisma.notification.create({
        data: { user_id: request.requester_id, actor_id: me.id, notif_type: 'follow', content: `${me.name} accepted your follow request` },
      }),
    ]);
    return NextResponse.json({ status: 'accepted' });
  }

  await prisma.followRequest.update({ where: { id: request.id }, data: { status: 'rejected' } });
  return NextResponse.json({ status: 'rejected' });
}
