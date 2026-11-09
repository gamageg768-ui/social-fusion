import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const parsedId = Number(params.id);
  if (isNaN(parsedId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await prisma.story.update({
    where: { id: parsedId },
    data: { viewed: true },
  });
  return NextResponse.json({ ok: true });
}
