import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthSessionProvider } from '@/components/providers/SessionProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { CurrencyProvider } from '@/components/providers/CurrencyProvider';
import './globals.css';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'POS Workshop | Auto Parts & Repair',
  description: 'Point of Sale and Workshop Management System for automotive businesses.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-zinc-950 text-white antialiased font-sans">
        <AuthSessionProvider>
          <QueryProvider>
            <CurrencyProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
              >
                {children}
              </ThemeProvider>
            </CurrencyProvider>
          </QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
