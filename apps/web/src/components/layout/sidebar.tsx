'use client';

import { cn } from '@fe/lib/utils';
import { SITE_NAME } from '@xirpl/shared';
import {
  AlbumIcon,
  AlignRightIcon,
  BookOpenCheckIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  Code2Icon,
  HomeIcon,
  LayoutDashboardIcon,
  TrophyIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@fe/hooks/use-user';
import { Button } from '@xirpl/shared/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';

type Bars = {
  title?: string;
  items: {
    name: string;
    icon: typeof HomeIcon;
    path?: string;
  }[];
}[];

const bars: Bars = [
  {
    title: 'Menu',
    items: [
      { name: 'Home', icon: HomeIcon, path: '/' },
      { name: 'Album', icon: AlbumIcon, path: '/albums' },
      { name: 'Jurnal Kebiasaan', icon: BookOpenCheckIcon, path: '/habit' },
      { name: 'Peringkat', icon: TrophyIcon, path: '/leaderboard' },
    ],
  },
  {
    title: 'Administrasi Kelas',
    items: [
      {
        name: 'Jadwal Pelajaran',
        icon: CalendarDaysIcon,
        path: '/schedules/subject',
      },
      {
        name: 'Jadwal Piket',
        icon: ClipboardListIcon,
        path: '/schedules/picket',
      },
    ],
  },
];

const active =
  'bg-pastel-blue border-brand-blue/50 text-brand-blue shadow-[0_3px_0_0_var(--duo-shade)] hover:bg-pastel-blue hover:text-brand-blue dark:bg-blue-500/20 dark:text-blue-300';

const itemBase =
  'h-11 rounded-2xl border-2 border-transparent text-base font-extrabold';

// Mirrors ADMIN_ROLES in apps/api (can't import across apps).
const ADMIN_ROLES = [
  'developer',
  'teacher',
  'homeroom_teacher',
  'leader',
  'vice_leader',
];

export default function AppSidebar() {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const path = usePathname();
  const { user } = useUser();
  const isAdmin = !!user?.role && ADMIN_ROLES.includes(user.role);

  // Close after navigation commits — closing on click races the route
  // transition and the sheet re-pops mid-render.
  useEffect(() => {
    setOpenMobile(false);
  }, [path, setOpenMobile]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-start justify-between gap-2 px-2 py-1">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/favicon.ico"
              alt=""
              width={36}
              height={36}
              className="rounded-xl"
            />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-brand-navy text-lg font-extrabold dark:text-white">
                {SITE_NAME}
              </span>
              <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                SMK N 1 Kandeman
              </span>
            </span>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-2xl"
            aria-label="Tutup menu"
            onClick={toggleSidebar}
            pointer
          >
            <AlignRightIcon />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="whitespace-nowrap">
        {bars.map((v, i) => (
          <SidebarGroup key={v.title ?? `group-${i}`}>
            {v.title && (
              <SidebarGroupLabel className="text-xs font-extrabold tracking-widest uppercase">
                {v.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {v.items.map((w) => (
                  <SidebarMenuItem key={w.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={path === w.path}
                      className={cn(itemBase, path === w.path && active)}
                    >
                      {w.path ? (
                        <Link href={w.path}>
                          <w.icon /> {w.name}
                        </Link>
                      ) : (
                        <div>
                          <w.icon /> {w.name}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-extrabold tracking-widest uppercase">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                <SidebarMenuItem>
                  <SidebarMenuButton className={itemBase} asChild>
                    <a
                      href={
                        process.env.NEXT_PUBLIC_ADMIN_URL ??
                        'http://localhost:3620'
                      }
                    >
                      <LayoutDashboardIcon /> Panel Admin
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="border-border/70 flex flex-col gap-1 px-2 pt-3 pb-1">
          <div className="flex items-center justify-center gap-1">
            <a
              href="https://github.com/tiga-searah/xirpl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub XI RPL"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 items-center justify-center rounded-xl border-2 border-transparent transition-colors"
            >
              <GithubMark className="size-4.5" />
            </a>
            <a
              href="https://api-xirpl.tigasearah.my.id"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Dokumentasi API XI RPL"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex size-9 items-center justify-center rounded-xl border-2 border-transparent transition-colors"
            >
              <Code2Icon className="size-4.5" />
            </a>
          </div>
          <p className="text-muted-foreground mt-1 text-center text-[11px] font-semibold tracking-wide">
            V2.1.4
          </p>
          <p className="text-muted-foreground mt-1 text-center text-[11px] font-semibold tracking-wide">
            © 2026 TigaSearah
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Ikon GitHub dari https://thesvg.org/icons/github/default.svg
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
        transform="scale(64)"
        fill="currentColor"
      />
    </svg>
  );
}
