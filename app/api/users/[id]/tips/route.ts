import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const tips = await prisma.tip.findMany({
    where: { receiver_id: Number(params.id) },
    include: { sender: true },
    orderBy: { created_at: 'desc' },
    take: 20,
  });
  const total = tips.reduce((s, t) => s + t.amount, 0);
  return NextResponse.json({ tips: tips.map(t => ({ ...t, created_at: t.created_at.toISOString(), sender: { ...t.sender, created_at: t.sender.created_at.toISOString(), last_seen: t.sender.last_seen?.toISOString() ?? null } })), total });
}
