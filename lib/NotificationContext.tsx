'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface NotificationContextValue {
  unreadCount: number;
  clearCount: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0, clearCount: () => {} });

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const source = new EventSource('/api/notifications/stream');
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init') setUnreadCount(data.unread);
        if (data.type === 'new') setUnreadCount(prev => prev + data.notifications.length);
      } catch {}
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, []);

  const clearCount = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, clearCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
