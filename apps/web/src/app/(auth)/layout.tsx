import type { Metadata } from 'next';
import '../globals.css';
import { Analytics } from '@fe/components/analytics';
import { DayThemeSync } from '@fe/components/day-theme-sync';
import { DAY_THEME_INIT_SCRIPT } from '@fe/lib/day-theme';
import { ThemeProvider } from '@xirpl/shared/components/theme-provider';
import { SITE_NAME } from '@xirpl/shared';
import { DM_Sans, Fredoka } from 'next/font/google';
import { type ReactNode, Suspense } from 'react';

export const metadata: Metadata = {
  title: `Login | ${SITE_NAME}`,
  description: `Login to the website of class ${SITE_NAME} of SMK N 1 Kandeman`,
};

const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
});
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline day-theme init script prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: DAY_THEME_INIT_SCRIPT }} />
        <Analytics />
      </head>
      <body
        className={`antialiased ${fredoka.variable} ${dmSans.variable} flex min-h-dvh items-center justify-center`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DayThemeSync />
          <Suspense>{children}</Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
