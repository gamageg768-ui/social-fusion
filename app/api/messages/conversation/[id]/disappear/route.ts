import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

const VALID_MODES = ['off', '1h', '8h', '24h', '7d'];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const partnerId = Number(params.id);
  const { mode } = await req.json();

  if (!VALID_MODES.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  const meta = await prisma.conversationMeta.upsert({
    where: { user_id_partner_id: { user_id: me.id, partner_id: partnerId } },
    create: { user_id: me.id, partner_id: partnerId, disappear_after: mode },
    update: { disappear_after: mode },
  });

  return NextResponse.json({ disappear_after: meta.disappear_after });
}
