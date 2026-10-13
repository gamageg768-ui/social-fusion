import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const comId = Number(params.id);
  const existing = await prisma.communityMember.findUnique({ where: { community_id_user_id: { community_id: comId, user_id: me.id } } });
  if (existing) {
    await prisma.communityMember.delete({ where: { community_id_user_id: { community_id: comId, user_id: me.id } } });
    return NextResponse.json({ is_member: false });
  }
  await prisma.communityMember.create({ data: { community_id: comId, user_id: me.id, role: 'member' } });
  return NextResponse.json({ is_member: true });
}
