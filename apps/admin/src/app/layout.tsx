import type { Metadata } from 'next';
import { DM_Sans, Fredoka } from 'next/font/google';
import { ThemeProvider } from '@xirpl/shared/components/theme-provider';
import { TooltipProvider } from '@xirpl/shared/components/ui/tooltip';
import { SITE_NAME } from '@xirpl/shared/constants';
import { AdminGate } from '../components/admin-gate';
import { AdminHeader } from '../components/admin-header';
import { AdminSidebar } from '../components/admin-sidebar';
import { DayThemeSync } from '../components/day-theme-sync';
import { DAY_THEME_INIT_SCRIPT } from '../lib/day-theme';
import { SidebarProvider } from '@xirpl/shared/components/ui/sidebar';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: `Admin | ${SITE_NAME}`,
  description: `Dasbor Admin ${SITE_NAME}`,
};

const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'] });
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const defaultOpen = (await cookies()).get('sidebar_state')?.value === 'true';
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: inline day-theme init script prevents FOUC */}
        <script dangerouslySetInnerHTML={{ __html: DAY_THEME_INIT_SCRIPT }} />
      </head>
      <body className={`min-h-svh overflow-x-clip antialiased ${fredoka.variable} ${dmSans.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DayThemeSync />
          <TooltipProvider>
            <AdminGate>
              <SidebarProvider defaultOpen={defaultOpen}>
                <AdminSidebar />
                <main className="min-h-svh min-w-0 flex-1">
                  <AdminHeader />
                  {children}
                </main>
              </SidebarProvider>
            </AdminGate>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
