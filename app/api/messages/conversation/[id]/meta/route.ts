import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ is_muted: false, disappear_after: 'off' });

  const partnerId = Number(params.id);

  const meta = await prisma.conversationMeta.findUnique({
    where: { user_id_partner_id: { user_id: me.id, partner_id: partnerId } },
  });

  return NextResponse.json({
    is_muted: meta?.is_muted ?? false,
    disappear_after: meta?.disappear_after ?? 'off',
  });
}
