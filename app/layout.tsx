import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { BRAND_CONFIG } from './config/brand';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: BRAND_CONFIG.meta.title,
  description: BRAND_CONFIG.meta.description,
  keywords: BRAND_CONFIG.meta.keywords,
  authors: [{ name: BRAND_CONFIG.name }],
  openGraph: {
    title: BRAND_CONFIG.meta.title,
    description: BRAND_CONFIG.meta.description,
    type: 'website',
    siteName: BRAND_CONFIG.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_CONFIG.meta.title,
    description: BRAND_CONFIG.meta.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}