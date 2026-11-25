import type { Metadata } from 'next';
import '../globals.css';
import { Analytics } from '@fe/components/analytics';
import { DayThemeSync } from '@fe/components/day-theme-sync';
import NavBar from '@fe/components/layout/navbar';
import AppSidebar from '@fe/components/layout/sidebar';
import { SidebarProvider } from '@fe/components/ui/sidebar';
import { DAY_THEME_INIT_SCRIPT } from '@fe/lib/day-theme';
import { SITE_NAME } from '@xirpl/shared';
import { ThemeProvider } from '@xirpl/shared/components/theme-provider';
import { TooltipProvider } from '@xirpl/shared/components/ui/tooltip';
import { DM_Sans, Fredoka } from 'next/font/google';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: `Home | ${SITE_NAME}`,
  description: `Website for class ${SITE_NAME} of SMK N 1 Kandeman`,
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
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline day-theme init script prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: DAY_THEME_INIT_SCRIPT }} />
        <Analytics />
      </head>
      <body
        className={`min-h-svh overflow-x-clip antialiased ${fredoka.variable} ${dmSans.variable}`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DayThemeSync />
          <TooltipProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar />
              <main className="min-h-svh min-w-0 flex-1">
                <NavBar />
                {children}
              </main>
            </SidebarProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
