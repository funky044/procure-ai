import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export const metadata: Metadata = {
  title: 'ProcureAI - Conversational Procurement Platform',
  description: 'The conversation IS the application. No forms. No dashboards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-surface-950 text-surface-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
