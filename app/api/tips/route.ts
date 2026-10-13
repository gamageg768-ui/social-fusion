import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { receiver_id, amount, message } = await req.json().catch(() => ({}));
  if (!receiver_id || !amount) return NextResponse.json({ error: 'receiver_id and amount required' }, { status: 400 });
  if (Number(receiver_id) === me.id) return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
  const VALID_AMOUNTS = [1, 3, 5, 10];
  if (!VALID_AMOUNTS.includes(Number(amount))) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  const tip = await prisma.tip.create({
    data: { sender_id: me.id, receiver_id: Number(receiver_id), amount: Number(amount), message: message ?? '' },
    include: { sender: true },
  });
  return NextResponse.json({
    id: tip.id, sender_id: tip.sender_id, receiver_id: tip.receiver_id, amount: tip.amount, message: tip.message,
    created_at: tip.created_at.toISOString(),
    sender: { ...tip.sender, created_at: tip.sender.created_at.toISOString(), last_seen: tip.sender.last_seen?.toISOString() ?? null },
  }, { status: 201 });
}
