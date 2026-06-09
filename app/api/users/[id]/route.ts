import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const user = await prisma.user.findUnique({ where: { id: Number(params.id) } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...user, created_at: user.created_at.toISOString() });
}
