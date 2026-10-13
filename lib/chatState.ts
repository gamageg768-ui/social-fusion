// Module-level in-memory typing state shared across SSE and typing routes
// key: "senderId:receiverId"
export const typingMap = new Map<string, { typing: boolean; ts: number }>();
