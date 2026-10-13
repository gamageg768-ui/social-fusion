import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const chId = Number(params.id);
  const existing = await prisma.channelSubscription.findUnique({ where: { channel_id_user_id: { channel_id: chId, user_id: me.id } } });
  if (existing) {
    await prisma.channelSubscription.delete({ where: { channel_id_user_id: { channel_id: chId, user_id: me.id } } });
    return NextResponse.json({ is_subscribed: false });
  }
  await prisma.channelSubscription.create({ data: { channel_id: chId, user_id: me.id } });
  return NextResponse.json({ is_subscribed: true });
}
