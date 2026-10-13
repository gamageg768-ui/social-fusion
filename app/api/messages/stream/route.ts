import { NextRequest } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';
import { typingMap } from '@/lib/chatState';

export const dynamic = 'force-dynamic';

const DISAPPEAR_MS: Record<string, number> = {
  '1h': 3600000,
  '8h': 28800000,
  '24h': 86400000,
  '7d': 604800000,
};

function serMsg(m: any) {
  return {
    ...m,
    created_at: m.created_at.toISOString(),
    delivered_at: m.delivered_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    scheduled_at: m.scheduled_at?.toISOString() ?? null,
    sender: { ...m.sender, created_at: m.sender.created_at.toISOString(), last_seen: m.sender.last_seen?.toISOString() ?? null },
    reply_to: m.reply_to ? {
      ...m.reply_to,
      created_at: m.reply_to.created_at.toISOString(),
      delivered_at: m.reply_to.delivered_at?.toISOString() ?? null,
      sender: { ...m.reply_to.sender, created_at: m.reply_to.sender.created_at.toISOString(), last_seen: m.reply_to.sender.last_seen?.toISOString() ?? null },
    } : null,
  };
}

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const partnerId = Number(req.nextUrl.searchParams.get('partner_id'));
  if (!partnerId) return new Response('partner_id required', { status: 400 });

  const beforeId = req.nextUrl.searchParams.get('before_id');

  const encoder = new TextEncoder();
  let closed = false;
  let lastTypingState: boolean | null = null;
  let lastReadState: boolean | null = null;
  let lastPollTime = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
        }
      };

      // Initial batch (exclude scheduled/unreleased messages)
      const initMsgs = await prisma.message.findMany({
        where: {
          ...(beforeId ? { id: { lt: Number(beforeId) } } : {}),
          scheduled_at: null,
          OR: [
            { sender_id: me.id, receiver_id: partnerId },
            { sender_id: partnerId, receiver_id: me.id },
          ],
        },
        include: { sender: true, reactions: true, reply_to: { include: { sender: true } }, poll: { include: { votes: true } } },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
      const ordered = [...initMsgs].reverse();

      // Mark delivered on connect
      const undelivered = ordered.filter(m => m.receiver_id === me.id && !m.delivered_at);
      if (undelivered.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: undelivered.map(m => m.id) } },
          data: { delivered_at: new Date() },
        });
      }

      const [myStars, myPins] = await Promise.all([
        prisma.messageStar.findMany({ where: { user_id: me.id }, select: { message_id: true } }),
        prisma.messagePin.findMany({ where: { user_id: me.id }, select: { message_id: true } }),
      ]);
      const starSet = new Set(myStars.map(s => s.message_id));
      const pinSet = new Set(myPins.map(p => p.message_id));

      send({
        type: 'init',
        messages: ordered.map(m => ({ ...serMsg(m), is_starred: starSet.has(m.id), is_pinned: pinSet.has(m.id) })),
        has_more: initMsgs.length === 50,
      });

      let lastId = ordered[ordered.length - 1]?.id ?? 0;
      lastPollTime = new Date();

      const poll = async () => {
        if (closed) return;
        try {
          // Disappearing messages cleanup
          const meta = await prisma.conversationMeta.findUnique({
            where: { user_id_partner_id: { user_id: me.id, partner_id: partnerId } },
          });
          if (meta?.disappear_after && meta.disappear_after !== 'off') {
            const ms = DISAPPEAR_MS[meta.disappear_after];
            if (ms) {
              const cutoff = new Date(Date.now() - ms);
              const toExpire = await prisma.message.findMany({
                where: {
                  created_at: { lt: cutoff },
                  message_type: { not: 'deleted' },
                  OR: [
                    { sender_id: me.id, receiver_id: partnerId },
                    { sender_id: partnerId, receiver_id: me.id },
                  ],
                },
                select: { id: true },
              });
              if (toExpire.length > 0) {
                const ids = toExpire.map(m => m.id);
                await prisma.message.updateMany({
                  where: { id: { in: ids } },
                  data: { message_type: 'deleted', content: '', image_url: '' },
                });
                send({ type: 'expired', ids });
              }
            }
          }

          // Scheduled message release
          const toRelease = await prisma.message.findMany({
            where: {
              sender_id: me.id,
              receiver_id: partnerId,
              scheduled_at: { lte: new Date() },
            },
            include: { sender: true, reactions: true, reply_to: { include: { sender: true } }, poll: { include: { votes: true } } },
          });
          if (toRelease.length > 0) {
            await prisma.message.updateMany({
              where: { id: { in: toRelease.map(m => m.id) } },
              data: { scheduled_at: null },
            });
            for (const msg of toRelease) {
              if (msg.id > lastId) lastId = msg.id;
              send({ type: 'new', message: { ...serMsg(msg), is_starred: false, is_pinned: false } });
            }
          }

          // New messages
          const newMsgs = await prisma.message.findMany({
            where: {
              id: { gt: lastId },
              scheduled_at: null,
              OR: [
                { sender_id: me.id, receiver_id: partnerId },
                { sender_id: partnerId, receiver_id: me.id },
              ],
            },
            include: { sender: true, reactions: true, reply_to: { include: { sender: true } }, poll: { include: { votes: true } } },
            orderBy: { created_at: 'asc' },
          });
          if (newMsgs.length > 0) {
            lastId = Math.max(...newMsgs.map(m => m.id));
            const toDeliver = newMsgs.filter(m => m.receiver_id === me.id && !m.delivered_at);
            if (toDeliver.length > 0) {
              await prisma.message.updateMany({
                where: { id: { in: toDeliver.map(m => m.id) } },
                data: { delivered_at: new Date() },
              });
            }
            for (const msg of newMsgs) {
              send({ type: 'new', message: { ...serMsg(msg), is_starred: false, is_pinned: false } });
            }
          }

          // Edited messages
          const pollTime = lastPollTime;
          lastPollTime = new Date();
          const editedMsgs = await prisma.message.findMany({
            where: {
              edited_at: { gt: pollTime },
              OR: [
                { sender_id: me.id, receiver_id: partnerId },
                { sender_id: partnerId, receiver_id: me.id },
              ],
            },
            include: { sender: true, reactions: true, reply_to: { include: { sender: true } }, poll: { include: { votes: true } } },
          });
          for (const msg of editedMsgs) {
            send({ type: 'edited', message: serMsg(msg) });
          }

          // Typing state
          const key = `${partnerId}:${me.id}`;
          const typingEntry = typingMap.get(key);
          const isTyping = !!typingEntry && typingEntry.typing && (Date.now() - typingEntry.ts) < 3000;
          if (isTyping !== lastTypingState) {
            lastTypingState = isTyping;
            send({ type: 'typing', typing: isTyping });
          }

          // Read receipt
          const unreadCount = await prisma.message.count({
            where: { sender_id: me.id, receiver_id: partnerId, is_read: false },
          });
          const allRead = unreadCount === 0;
          if (lastReadState !== null && allRead !== lastReadState) send({ type: 'read' });
          lastReadState = allRead;
        } catch {}
      };

      const interval = setInterval(poll, 1000);
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
