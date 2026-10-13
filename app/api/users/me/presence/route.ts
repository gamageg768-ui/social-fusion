import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

const VALID = new Set(['online', 'away', 'busy', 'invisible']);

export async function PATCH(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { presence } = await req.json().catch(() => ({}));
  if (!VALID.has(presence)) return NextResponse.json({ error: 'Invalid presence' }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { presence },
  });

  return NextResponse.json({ presence: updated.presence });
}
