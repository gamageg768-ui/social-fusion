import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// PATCH /api/messages/[id]/read  — mark all messages from partner (id) as read
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const partnerId = Number(params.id);
  await prisma.message.updateMany({
    where: { sender_id: partnerId, receiver_id: me.id, is_read: false },
    data: { is_read: true },
  });

  return NextResponse.json({ ok: true });
}
