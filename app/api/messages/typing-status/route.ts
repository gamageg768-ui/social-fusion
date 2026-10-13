import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/utils';
import { typingMap } from '@/lib/chatState';

// Returns which partner IDs are currently typing to the current user
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({});

  const result: Record<number, boolean> = {};
  const now = Date.now();

  for (const [key, val] of typingMap.entries()) {
    // key format: "senderId:receiverId"
    const [senderId, receiverId] = key.split(':').map(Number);
    if (receiverId === me.id && val.typing && (now - val.ts) < 3000) {
      result[senderId] = true;
    }
  }

  return NextResponse.json(result);
}
