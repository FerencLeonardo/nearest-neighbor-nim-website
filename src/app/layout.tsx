import type { Metadata } from 'next';
import { STIX_Two_Text, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const stix = STIX_Two_Text({
  variable: '--font-stix',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Nearest Neighbor Nim',
  description:
    'Sketch a graph, count the stones, and compute the nim value — or play against the computer.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${stix.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-sans">
        <Header />
        {children}
      </body>
    </html>
  );
}
