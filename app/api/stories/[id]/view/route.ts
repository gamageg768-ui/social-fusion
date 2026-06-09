import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  await prisma.story.update({
    where: { id: Number(params.id) },
    data: { viewed: true },
  });
  return NextResponse.json({ ok: true });
}
