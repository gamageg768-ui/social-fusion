import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([], { status: 401 });

  const msgId = Number(params.id);
  const reactions = await prisma.messageReaction.findMany({
    where: { message_id: msgId },
    include: { user: true },
    orderBy: { created_at: 'asc' },
  });

  const grouped: Record<string, { emoji: string; users: object[] }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, users: [] };
    grouped[r.emoji].users.push({
      id: r.user.id,
      name: r.user.name,
      username: r.user.username,
      avatar: r.user.avatar,
    });
  }

  return NextResponse.json(Object.values(grouped));
}
