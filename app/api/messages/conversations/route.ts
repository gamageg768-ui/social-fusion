import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET() {
  const prisma = await ensureDb();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  if (!me) return NextResponse.json([]);

  // Get all messages involving me
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ sender_id: me.id }, { receiver_id: me.id }],
    },
    include: { sender: true, receiver: true },
    orderBy: { created_at: 'desc' },
  });

  // Group by conversation partner
  const convMap = new Map<number, { user: any; last_message: string; last_time: string; unread: boolean }>();
  for (const msg of messages) {
    const partnerId = msg.sender_id === me.id ? msg.receiver_id : msg.sender_id;
    const partner = msg.sender_id === me.id ? msg.receiver : msg.sender;
    if (!convMap.has(partnerId)) {
      convMap.set(partnerId, {
        user: { ...partner, created_at: partner.created_at.toISOString() },
        last_message: msg.content,
        last_time: msg.created_at.toISOString(),
        unread: msg.receiver_id === me.id && !msg.is_read,
      });
    }
  }

  return NextResponse.json(Array.from(convMap.values()));
}
