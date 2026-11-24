'use client';

import type { UserModel } from '@be/modules/user/model';

type IProfile = UserModel['User'];

import { useStreak } from '@fe/hooks/use-streak';
import { useUser } from '@fe/hooks/use-user';
import api, { fileUrl } from '@fe/lib/api';
import { cn } from '@fe/lib/utils';
import { SITE_NAME } from '@xirpl/shared';
import { Button } from '@xirpl/shared/components/ui/button';
import { revealTheme } from '@xirpl/shared/theme-transition';
import {
  AlignLeftIcon,
  FlameIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserRoundIcon,
} from 'lucide-react';
import { motion as m } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { fmtDate } from '../../../data/habit-data';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
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
    <nav
      className="bg-background sticky top-0 z-50 h-16 w-full border-b-2"
      style={{ viewTransitionName: 'navbar' }}
    >
      <div className="mx-auto flex h-full max-w-360 items-center justify-between gap-2 px-3 md:px-4">
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: expanded ? 0 : 1,
            y: expanded ? -20 : 0,
          }}
          transition={{ type: 'spring', duration: 0.6 }}
          className={cn(
            'flex items-center gap-1',
            expanded && 'pointer-events-none',
          )}
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
                  src={user?.avatar_url ? fileUrl(user.avatar_url) : undefined}
                  alt=""
                />
                <AvatarFallback>
                  {(user?.display_name || user?.username)?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0"
              align="end"
            >
              <Profile
                user={user}
                loginHref={`/login?r=${encodeURIComponent(pathname)}`}
              />
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
        const {
          left = 0,
          top = 0,
          width = 0,
          height = 0,
        } = el?.getBoundingClientRect() ?? {};
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

function Profile({ user, loginHref }: { user?: IProfile; loginHref: string }) {
  const handleLogout = async () => {
    await api.auth.logout.post();
    location.reload();
  };

  return (
    <>
      <DropdownMenuItem
        asChild
        className="cursor-pointer gap-3 rounded-none px-4 py-4 hover:bg-accent focus:bg-accent"
      >
        <Link href={user ? '/profile' : loginHref}>
          <Avatar className="size-11 shrink-0 border-2 border-border">
            <AvatarImage
              src={user?.avatar_url ? fileUrl(user.avatar_url) : undefined}
              alt=""
            />
            <AvatarFallback className="bg-pastel-blue font-bold text-brand-navy">
              {(user?.display_name?.trim() || user?.username)
                ?.charAt(0)
                .toUpperCase() || <UserRoundIcon aria-hidden />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {user?.display_name?.trim() || user?.username || 'Masuk'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email ?? 'Masuk ke akun kamu'}
            </p>
          </div>
        </Link>
      </DropdownMenuItem>
      {user && (
        <>
          <DropdownMenuSeparator className="m-0" />
          <DropdownMenuItem
            className="min-h-11 cursor-pointer justify-center rounded-none font-bold"
            onClick={handleLogout}
          >
            <LogOutIcon aria-hidden /> Log Out
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
