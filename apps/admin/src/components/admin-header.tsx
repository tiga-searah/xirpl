'use client';

import { Button } from '@xirpl/shared/components/ui/button';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@xirpl/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@xirpl/shared/components/ui/dropdown-menu';
import { SITE_NAME } from '@xirpl/shared/constants';
import { cn } from '@xirpl/shared/utils';
import { revealTheme } from '@xirpl/shared/theme-transition';
import { AlignLeftIcon, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '../hooks/use-user';
import api from '../lib/api';
import { useSidebar } from '@xirpl/shared/components/ui/sidebar';

export function AdminHeader() {
  const { toggleSidebar, isMobile, open, openMobile } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) =>
    revealTheme(e, () =>
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
    );

  const handleLogout = async () => {
    await api.auth.logout.post();
    location.reload();
  };

  const initial = (user?.display_name || user?.username)?.charAt(0);

  return (
    <header
      className="sticky top-0 z-10 border-b-2 border-border bg-background/80 backdrop-blur"
      style={{ viewTransitionName: 'navbar' }}
    >
      <div className="mx-auto flex max-w-360 items-center gap-2 px-3 py-2.5 md:px-4">
        {/* Like web NavBar: toggle + brand slide away while sidebar is open. */}
        <div
          className={cn(
            'flex items-center gap-1 transition-all duration-500',
            expanded && 'pointer-events-none -translate-y-5 opacity-0',
          )}
        >
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-2xl"
            aria-label={expanded ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={expanded}
            onClick={toggleSidebar}
            pointer
          >
            <AlignLeftIcon />
          </Button>
          <Link href="/" className="flex items-center gap-2 rounded-2xl px-1 py-1.5" aria-label={`${SITE_NAME} Admin`}>
            <img src="/favicon.ico" alt="" width={32} height={32} className="size-8 rounded-lg" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-lg font-extrabold uppercase tracking-tight">
                {SITE_NAME}
              </span>
              <span className="font-display text-xs font-bold uppercase tracking-widest text-primary">
                Admin
              </span>
            </span>
          </Link>
        </div>


        <div className="ml-auto flex items-center gap-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Ganti tema"
              onClick={toggleTheme}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-6" />
              ) : (
                <Moon className="size-6" />
              )}
            </Button>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className="ring-offset-background focus-visible:ring-ring cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Profil"
            >
              <Avatar className="size-10 border-2">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-fit overflow-hidden rounded-2xl p-0"
              align="end"
            >
              <div className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-2 px-4 py-2">
                <Avatar size="lg" className="row-span-2 self-center">
                  <AvatarImage src={user?.avatar_url ?? undefined} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <h2 className="font-bold">
                  {user?.display_name ?? user?.username ?? '—'}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="m-0" />
              <DropdownMenuItem
                className="h-10 cursor-pointer justify-center font-bold"
                onClick={handleLogout}
              >
                <LogOut /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
