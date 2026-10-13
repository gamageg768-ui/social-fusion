'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { TopBar, BottomNav } from './TopBar';
import RightPanel from '../Common/RightPanel';
import { NotificationProvider } from '@/lib/NotificationContext';

const RIGHT_PANEL_PATHS = ['/', '/explore'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showRight = RIGHT_PANEL_PATHS.includes(pathname);

  return (
    <NotificationProvider>
      <div className={`app-layout${showRight ? '' : ' no-right'}`}>
        <Sidebar />
        <TopBar />
        <main className="main-content">{children}</main>
        {showRight && (
          <aside className="right-panel">
            <RightPanel />
          </aside>
        )}
      </div>
      <BottomNav />
    </NotificationProvider>
  );
}
