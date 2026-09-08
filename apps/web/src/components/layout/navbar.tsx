'use client';

import type { UserModel } from '@be/modules/user/model';

type IProfile = UserModel['User'];
import { SITE_NAME } from '@xirpl/shared';
import { revealTheme } from '@xirpl/shared/theme-transition';
import {
  AlignLeftIcon,
  FlameIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
} from 'lucide-react';
import { motion as m } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useStreak } from '@fe/hooks/use-streak';
import { fmtDate } from '../../../data/habit-data';
import { useUser } from '@fe/hooks/use-user';
import api from '@fe/lib/api';
import { cn } from '@fe/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '@xirpl/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useSidebar } from '../ui/sidebar';

export default function NavBar() {
  const { user } = useUser();
  const pathname = usePathname();
  const sb = useSidebar();
  const streak = useStreak(!!user);
  const expanded = sb.isMobile ? sb.openMobile : sb.open;

  return (
    <nav className="bg-background sticky top-0 z-50 h-16 w-full border-b-2">
      <div className="mx-auto flex h-full max-w-360 items-center justify-between gap-2 px-3 md:px-4">
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: expanded ? 0 : 1,
            y: expanded ? -20 : 0,
          }}
          transition={{ type: 'spring', duration: 0.6 }}
          className={cn('flex items-center gap-1', expanded && 'pointer-events-none')}
        >
          <Button
            size="icon"
            variant="ghost"
            className="size-10 rounded-2xl"
            aria-label={expanded ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={expanded}
            pointer
            onClick={sb.toggleSidebar}
          >
            <AlignLeftIcon className="size-5" />
          </Button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl px-1 py-1.5"
          >
            <Image
              src="/favicon.ico"
              alt=""
              width={32}
              height={32}
              priority
              className="rounded-lg"
            />
            <span className="font-display text-brand-navy text-lg font-extrabold tracking-tight uppercase sm:text-xl dark:text-white">
              {SITE_NAME}
            </span>
          </Link>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.8, delay: 0.1 }}
          className="flex items-center gap-2"
        >
          {streak && (
            <Link
              href="/habit"
              title={`Streak ${streak.streak} hari`}
              className={cn(
                'duo-card duo-press flex h-11 items-center gap-1.5 rounded-full px-3 font-extrabold [--duo-depth:3px] sm:px-3.5',
                streak.streak > 0 && streak.since === fmtDate(new Date())
                  ? 'border-brand-yellow bg-pastel-yellow text-brand-navy [--duo-shade:#e0a800] dark:bg-amber-400/20 dark:text-amber-200'
                  : 'border-muted-foreground/30 bg-muted-foreground/15 text-muted-foreground [--duo-shade:color-mix(in_srgb,var(--muted-foreground)_35%,transparent)]',
              )}
            >
              <FlameIcon
                className={cn(
                  'size-4 sm:size-4.5',
                  streak.streak > 0 &&
                    streak.since === fmtDate(new Date()) &&
                    'text-amber-600',
                )}
              />
              <span className="text-base tabular-nums">{streak.streak}</span>
              <span className="sr-only">hari streak</span>
            </Link>
          )}

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className="ring-offset-background focus-visible:ring-ring cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Profil"
            >
              <Avatar className="border-border size-10 border-2">
                <AvatarImage
                  src={user?.avatar_url ?? '/images/profile_picture.jpg'}
                />
                <AvatarFallback>
                  {(user?.display_name || user?.username)?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-fit overflow-hidden rounded-2xl p-0"
              align="end"
            >
              {user ? (
                <Profile user={user} />
              ) : (
                <Link href={`/login?r=${pathname}`}>
                  {' '}
                  <Profile />{' '}
                </Link>
              )}
              <DropdownMenuSeparator className="m-0" />
              <ThemeItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </m.div>
      </div>
    </nav>
  );
}

function ThemeItem() {
  const { resolvedTheme: theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return (
    <DropdownMenuItem
      className="h-10 cursor-pointer justify-center font-bold"
      onSelect={(e) => {
        e.preventDefault();
        let n = theme === 'dark' ? 'light' : 'dark';
        if (n === systemTheme) n = 'system';
        // Reveal from the item's center; onSelect carries no pointer coords.
        const el = e.currentTarget as HTMLElement | null;
        const { left = 0, top = 0, width = 0, height = 0 } =
          el?.getBoundingClientRect() ?? {};
        revealTheme(
          { clientX: left + width / 2, clientY: top + height / 2 },
          () => setTheme(n),
        );
      }}
    >
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    </DropdownMenuItem>
  );
}

function Profile({ user }: { user?: IProfile }) {
  const handleLogout = async () => {
    await api.auth.logout.post();
    location.reload();
  };

  return (
    <>
      <div
        className={cn(
          'grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-x-2 px-4 py-2',
          !user && 'hover:bg-accent',
        )}
      >
        <Avatar className="row-span-2 self-center">
          <AvatarImage
            src={user?.avatar_url ?? '/images/profile_picture.jpg'}
          />
          <AvatarFallback>
            {(user?.display_name || user?.username)?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-bold">
          {user?.display_name ?? user?.username ?? 'Masuk'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {user?.email ?? 'Klik untuk log in'}
        </p>
      </div>
      {user && (
        <>
          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="h-10 cursor-pointer justify-center font-bold"
            onClick={handleLogout}
          >
            <LogOutIcon /> Log Out
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
