import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

// POST /api/messages/archive/[id]  (id = partner_id) — toggle archive
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const partnerId = Number(params.id);

  const existing = await prisma.conversationMeta.findUnique({
    where: { user_id_partner_id: { user_id: me.id, partner_id: partnerId } },
  });

  if (existing) {
    const updated = await prisma.conversationMeta.update({
      where: { id: existing.id },
      data: { is_archived: !existing.is_archived },
    });
    return NextResponse.json({ is_archived: updated.is_archived });
  }

  await prisma.conversationMeta.create({
    data: { user_id: me.id, partner_id: partnerId, is_archived: true },
  });
  return NextResponse.json({ is_archived: true });
}
