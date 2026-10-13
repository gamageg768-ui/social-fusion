import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const members = await prisma.userListMember.findMany({
    where: { list_id: Number(params.id) },
    include: { user: true },
    orderBy: { created_at: 'asc' },
  });

  return NextResponse.json(members.map(m => serializeUser(m.user)));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const list = await prisma.userList.findUnique({ where: { id: Number(params.id) } });
  if (!list || list.user_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  await prisma.userListMember.upsert({
    where: { list_id_user_id: { list_id: list.id, user_id: Number(user_id) } },
    create: { list_id: list.id, user_id: Number(user_id) },
    update: {},
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const list = await prisma.userList.findUnique({ where: { id: Number(params.id) } });
  if (!list || list.user_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { user_id } = await req.json();
  await prisma.userListMember.deleteMany({ where: { list_id: list.id, user_id: Number(user_id) } });

  return NextResponse.json({ success: true });
}
