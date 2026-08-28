import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HS³ Mess Portal',
  description: 'Smart Hostel Mess Management & Attendance Portal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HS³ Mess',
  },
};

export const viewport: Viewport = {
  themeColor: '#100e14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#100e14] text-[#F5E6EB] min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}