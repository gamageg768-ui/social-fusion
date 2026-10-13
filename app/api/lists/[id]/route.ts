import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const list = await prisma.userList.findUnique({ where: { id: Number(params.id) } });
  if (!list || list.user_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.userListMember.deleteMany({ where: { list_id: list.id } });
  await prisma.userList.delete({ where: { id: list.id } });

  return NextResponse.json({ success: true });
}
