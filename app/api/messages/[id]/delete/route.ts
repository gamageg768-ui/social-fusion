import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const msg = await prisma.message.findUnique({ where: { id: Number(params.id) } });
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (msg.sender_id !== me.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.message.update({
    where: { id: msg.id },
    data: { message_type: 'deleted', content: '', image_url: '' },
  });

  return NextResponse.json({ ok: true });
}
