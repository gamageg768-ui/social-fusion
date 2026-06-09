import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/Layout/AppShell';

export const metadata: Metadata = {
  title: 'SocialFusion',
  description: 'The ultimate social platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SocialFusion',
  },
};

export const viewport: Viewport = {
  themeColor: '#38BDF8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
