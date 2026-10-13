import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mutedId = Number(params.id);
  if (!mutedId || mutedId === me.id) return NextResponse.json({ error: 'Invalid' }, { status: 400 });

  const existing = await prisma.mutedUser.findUnique({
    where: { user_id_muted_id: { user_id: me.id, muted_id: mutedId } },
  });

  if (existing) {
    await prisma.mutedUser.delete({ where: { user_id_muted_id: { user_id: me.id, muted_id: mutedId } } });
    return NextResponse.json({ muted: false });
  }

  await prisma.mutedUser.create({ data: { user_id: me.id, muted_id: mutedId } });
  return NextResponse.json({ muted: true });
}
