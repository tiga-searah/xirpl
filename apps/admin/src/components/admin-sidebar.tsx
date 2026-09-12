'use client';

import { Button } from '@xirpl/shared/components/ui/button';
import {
  AlignRightIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  HomeIcon,
  ScrollTextIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SITE_NAME } from '@xirpl/shared/constants';
import { cn } from '@xirpl/shared/utils';
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
} from '@xirpl/shared/components/ui/sidebar';

const bars: {
  title: string;
  items: { name: string; icon: typeof HomeIcon; path?: string }[];
}[] = [
  {
    title: 'Menu',
    items: [
      { name: 'Beranda', icon: HomeIcon, path: '/' },
      { name: 'Kebiasaan', icon: ScrollTextIcon, path: '/habit' },
      { name: 'Jadwal Pelajaran', icon: CalendarDaysIcon },
      { name: 'Jadwal Piket', icon: ClipboardListIcon },
    ],
  },
];

const active =
  'bg-pastel-green border-brand-blue/50 text-brand-blue shadow-[0_3px_0_0_var(--duo-shade)] hover:bg-pastel-green hover:text-brand-blue dark:bg-green-500/20 dark:text-green-300';

const itemBase =
  'h-11 rounded-2xl border-2 border-transparent text-base font-extrabold';

export function AdminSidebar() {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const path = usePathname();

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
            <img src="/favicon.ico" alt="" width={36} height={36} className="rounded-xl" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold text-brand-navy dark:text-white">
                {SITE_NAME}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Admin
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
        {bars.map((v) => (
          <SidebarGroup key={v.title}>
            <SidebarGroupLabel className="text-xs font-extrabold tracking-widest uppercase">
              {v.title}
            </SidebarGroupLabel>
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
                        <div className="text-muted-foreground">
                          <w.icon /> {w.name}
                          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">
                            Segera
                          </span>
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <p className="text-muted-foreground pb-1 text-center text-[11px] font-semibold tracking-wide">
          V1.1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
