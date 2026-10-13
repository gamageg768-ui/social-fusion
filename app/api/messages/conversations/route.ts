import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const [messages, metas] = await Promise.all([
    prisma.message.findMany({
      where: { OR: [{ sender_id: me.id }, { receiver_id: me.id }] },
      include: { sender: true, receiver: true },
      orderBy: { created_at: 'desc' },
    }),
    prisma.conversationMeta.findMany({ where: { user_id: me.id } }),
  ]);

  const metaMap = new Map(metas.map(m => [m.partner_id, m]));

  const convMap = new Map<number, {
    user: object; last_message: string; last_time: string;
    unread: boolean; unread_count: number; is_archived: boolean;
    is_muted: boolean; disappear_after: string;
  }>();

  for (const msg of messages) {
    const partnerId = msg.sender_id === me.id ? msg.receiver_id : msg.sender_id;
    const partner = msg.sender_id === me.id ? msg.receiver : msg.sender;
    if (!convMap.has(partnerId)) {
      const preview = msg.message_type === 'deleted' ? 'Message deleted'
        : msg.message_type === 'image' ? '📷 Image'
        : msg.message_type === 'audio' ? '🎤 Voice message'
        : msg.message_type === 'gif' ? '🎞 GIF'
        : msg.content;
      const meta = metaMap.get(partnerId);
      convMap.set(partnerId, {
        user: { ...partner, created_at: partner.created_at.toISOString(), last_seen: partner.last_seen?.toISOString() ?? null },
        last_message: preview,
        last_time: msg.created_at.toISOString(),
        unread: msg.receiver_id === me.id && !msg.is_read,
        unread_count: 0,
        is_archived: meta?.is_archived ?? false,
        is_muted: meta?.is_muted ?? false,
        disappear_after: meta?.disappear_after ?? 'off',
      });
    }
  }

  for (const msg of messages) {
    if (msg.receiver_id === me.id && !msg.is_read) {
      const entry = convMap.get(msg.sender_id);
      if (entry) entry.unread_count += 1;
    }
  }

  return NextResponse.json(Array.from(convMap.values()));
}
