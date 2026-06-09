import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const data = await req.json();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  const msg = await prisma.message.create({
    data: {
      sender_id: me!.id,
      receiver_id: Number(data.receiver_id),
      content: data.content,
      is_read: false,
    },
    include: { sender: true },
  });

  return NextResponse.json({
    ...msg,
    created_at: msg.created_at.toISOString(),
    sender: { ...msg.sender, created_at: msg.sender.created_at.toISOString() },
  }, { status: 201 });
}
